export class ContentRepository {
  async save(content: { contentId: string; status: string; reason: string }) {
    console.log(`Saving content: ${JSON.stringify(content)}`);
  }
}
