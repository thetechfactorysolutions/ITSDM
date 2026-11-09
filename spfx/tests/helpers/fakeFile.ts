import { IFileHandleLike } from '../../src/data/persistence';

/** A fake file in memory that behaves like a browser FileSystemFileHandle for what is used. */
export class FakeFile implements IFileHandleLike {
  public name = 'data.json';
  public text = '';
  public modified = 1000;
  public failNextWrite = false;

  public async getFile(): Promise<{ lastModified: number; size: number; text(): Promise<string> }> {
    const text = this.text;
    return { lastModified: this.modified, size: text.length, text: async () => text };
  }

  public async createWritable(): Promise<{ write(d: string): Promise<void>; close(): Promise<void> }> {
    let pending = '';
    return {
      write: async (d: string) => { pending += d; },
      close: async () => {
        if (this.failNextWrite) {
          this.failNextWrite = false;
          throw new Error('disk full');
        }
        this.text = pending;
        this.modified++;
      }
    };
  }
}
