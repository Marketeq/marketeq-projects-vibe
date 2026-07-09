import AxiosRequest from ".."

export type CategoryTreeNode = {
  uuid: string
  name: string
  slug: string
  approved: boolean
  published_in_marketplace: boolean
  children?: CategoryTreeNode[]
}

export const CategoryAPI = {
  getTree: () => AxiosRequest.get("/categories/tree"),
}
