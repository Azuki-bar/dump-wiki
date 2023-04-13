import { PrismaClient, pages } from '@prisma/client'
const prisma = new PrismaClient();
type TraversedPage = pages[]
const apiKEY = 'REPLACE ME'

interface PageInfo {
    title: string;
    id: number;
    body: string;
}
async function createPages(pages: PageInfo[]) {
    for (const page of pages) {
        const res = await fetch(`http://127.0.0.1:3000/_api/v3/pages?api_key=${apiKEY}`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ body: page.body, path: page.title, access_token: apiKEY })
        })
        if (res.status >= 300) {
            console.log(await res.text())
        }
    }
}
async function fetchAll() {
    const rootPage = await prisma.pages.findFirst({
        where: {
            parent_id: null
        }
    })
    if (rootPage === null) { return }
    const rootChildren = await traverse([rootPage])
    const willJson = rootChildren.map<PageInfo>(page => {
        return {
            title: toString(page),
            id: Number(page.at(-1)?.id),
            body: page.at(-1)?.content ?? ""
        }
    }).sort((a, b) => a.title.localeCompare(b.title))
    return willJson;
}

function toString(path: TraversedPage): string {
    return path.map(p => p.title).reduce((prev, current) => `${prev}/${encodeTo(current)}`)
}
const encodeTo = (s: string): string => s

async function traverse(parent: TraversedPage): Promise<TraversedPage[]> {
    const leaf = parent.at(-1)
    const children = await prisma.pages.findMany({ where: { parent_id: leaf?.id } })
    if (children.length === 0) { return [] }
    const newRoutes: TraversedPage[] = children.map(child => parent.concat([child]))
    let allOfRoutes: TraversedPage[] = newRoutes

    for (const route of newRoutes) {
        allOfRoutes = allOfRoutes.concat(await traverse(route))
    }
    return allOfRoutes

}
async function main() {
    const pages = await fetchAll()
    if (pages !== undefined) {
        await createPages(pages)
    }
}

main().then(async () => { await prisma.$disconnect() })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })

