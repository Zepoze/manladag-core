/* eslint-disable no-unused-vars */
import fs from 'fs';
import {ManladagLibError} from './ManladagLibError';
export {default as MlagZip} from './mlagZip';
import {CoreFunc, Manladag, ObjectBaseCoreFunc, OptionalCoreFunc, StartOptions} from './manladag-namespace';
import {ChapterDownloader} from './chapterDownloader';
export {Manladag} from './manladag-namespace';

export namespace ChapterDownloaderFlags {
    export enum STATE {
        WAITING_TO_START = 0x01,
        STARTED = 0x02,
        WAITING_TO_ABORT = 0x08,
        FORCE_ABORT = 0x10,
        FINISHED = 0x20
    }
    export enum INIT {
        AUTO_START = 0b01,
        CLEAR_EVENTS = 0b10,
        /**
         * No clear Events and no auto_start
         */
        NONE = 0b00
    }
    export enum ACTION {
        DONE = 1,
        NOT_DONE = 0
    }
}

/**
 * @template MangaLib
 * @template MangaLibKeys
 * @class
 */

export class ManladagCore<MangaLib extends Manladag.LibManga, MangaLibKeys extends string, OptionalFunc extends keyof OptionalCoreFunc<MangaLib>> implements Manladag.LibCoreExtended<keyof OptionalCoreFunc<MangaLib>, MangaLib, MangaLibKeys> {
  readonly downloadEvents: Partial<Manladag.DownloadEvents> = {}

  get mangas() {
    return this.source.mangas;
  }
  get website() {
    return this.source.website;
  }
  get url() {
    return this.source.url;
  }

  constructor( private source : Manladag.LibCore<MangaLib, MangaLibKeys> | Manladag.LibCoreExtended<OptionalFunc, MangaLib, MangaLibKeys> ) {
    this.source = source;
  }

  public implement(func:keyof OptionalCoreFunc): func is OptionalFunc {
    return !!(this.source as any)[func];
  }

  private _useRequiredLibFunction<T extends keyof CoreFunc<MangaLib>>(func:T, ...args:Parameters<CoreFunc<MangaLib>[T]>): ReturnType<CoreFunc<MangaLib>[T]> {
    return this._useLibFunction< ObjectBaseCoreFunc< MangaLib, keyof CoreFunc<MangaLib>>, ReturnType<CoreFunc<MangaLib>[T]>>(func, args[0], ...args.slice(1));
  }

  private _useOptionalLibFunction<T extends keyof OptionalCoreFunc<MangaLib>>(func:T, ...args:Parameters<OptionalCoreFunc<MangaLib>[T]>): ReturnType<OptionalCoreFunc<MangaLib>[T]> {
    if (!this.implement(func)) throw new ManladagLibError(this.source, new Error(`The source ${this.website} dont implement the function \`${func}\` `));
    return this._useLibFunction< ObjectBaseCoreFunc< MangaLib, keyof OptionalCoreFunc<MangaLib>>, ReturnType<OptionalCoreFunc<MangaLib>[T]>>(func, args[0], ...args.slice(1));
  }

  private _useLibFunction<T extends ObjectBaseCoreFunc<MangaLib>, ReturnT = ReturnType<T[keyof T]>>(func: keyof T, ...args:[MangaLib | MangaLibKeys, ...any[]]): ReturnT {
    try {
      return ((this.source as any)[func] as (...args:any[]) => ReturnT)(...args);
    } catch (error:any) {
      throw new ManladagLibError(this.source, error);
    }
  }


  /**
     * Get asynchronously the number of page corresponding to the given chapter and manga
     */

  public async getNumberPageChapter(mangaKey:MangaLibKeys, chapter:number):Promise<number>
  public async getNumberPageChapter(manga:MangaLib, chapter:number):Promise<number>
  public async getNumberPageChapter(manga:MangaLib | MangaLibKeys, chapter:number):Promise<number> {
    const m = typeof manga == 'string' ? this.getManga(manga) : manga;
    return this._useRequiredLibFunction('getNumberPageChapter', m, chapter);
  }

  public async getUrlPages(manga:MangaLibKeys, chapter:number):Promise<string[]>
  public async getUrlPages(manga:MangaLib, chapter:number):Promise<string[]>
  public async getUrlPages(manga:MangaLib|MangaLibKeys, chapter:number):Promise<string[]> {
    const m = typeof manga == 'string' ? this.getManga(manga) : manga;
    return this._useRequiredLibFunction('getUrlPages', m, chapter);
  }

  /**
     * Get asynchronously the last chapter available to download corresponding to a given manga
     */
  public async getLastChapter(manga:MangaLibKeys):Promise<number>
  public async getLastChapter(manga:MangaLib):Promise<number>
  public async getLastChapter(manga:MangaLib|MangaLibKeys):Promise<number> {
    const m = typeof manga == 'string' ? this.getManga(manga) : manga;
    return this._useRequiredLibFunction('getLastChapter', m);
  }

  /**
     * Return true if the given manga's chapter is available to download
     */
  public async chapterIsAvailable(manga:MangaLibKeys, chapter:number): Promise<boolean>
  public async chapterIsAvailable(manga:MangaLib, chapter:number): Promise<boolean>
  public async chapterIsAvailable(manga:MangaLib|MangaLibKeys, chapter:number): Promise<boolean> {
    const m = typeof manga == 'string' ? this.getManga(manga) : manga;
    return this._useRequiredLibFunction('chapterIsAvailable', m, chapter);
  }

  /**
     * get chapter available between fromChapter and toChapter
     */
  public async getChaptersAvailable(manga:MangaLib, fromChapter:number, toChapter:number): Promise<number[]>
  public async getChaptersAvailable(manga:MangaLibKeys, fromChapter:number, toChapter:number): Promise<number[]>
  public async getChaptersAvailable(manga:MangaLib|MangaLibKeys, fromChapter:number, toChapter:number): Promise<number[]> {
    const m = typeof manga == 'string' ? this.getManga(manga) : manga;
    // return Promise.resolve([3]);
    return this._useOptionalLibFunction('getChaptersAvailable', m, fromChapter, toChapter);
  }


  /**
     * Download the given mang chapter in dirDownload
     */
  public async createChapterDownloader(manga:MangaLib, chapter:number, dirDownload:string, flag?:ChapterDownloaderFlags.INIT, defaultStartOptions?:StartOptions):Promise<ChapterDownloader>;
  public async createChapterDownloader(mangaKey:MangaLibKeys, chapter:number, dirDownload:string, flag?:ChapterDownloaderFlags.INIT, defaultStartOptions?:StartOptions):Promise<ChapterDownloader>;
  public async createChapterDownloader(manga:MangaLibKeys | MangaLib, chapter:number, dirDownload:string, flag:ChapterDownloaderFlags.INIT, defaultStartOptions?:StartOptions):Promise<ChapterDownloader> {
    if (chapter<0) throw new Error(`chapter should be a valid number but its '${chapter}'`);
    if (fs.existsSync(dirDownload)) {
      if (fs.lstatSync(dirDownload).isFile()) throw new Error(`${dirDownload} is not a directory`);
    } else {
      throw new Error(`the directory '${dirDownload}' doesnt exist`);
    }
    const m:MangaLib = typeof manga == 'string' ? this.getManga(manga) : manga;

    if (!(await this.chapterIsAvailable(m, chapter))) throw new Error(`The chapter ${chapter} is not available on ${this.website}`);

    const tabUrl:string[] = await this.getUrlPages(m, chapter);
    const c = new ChapterDownloader({chapter, manga: m, pagesUrl: tabUrl, url: this.url, website: this.website}, dirDownload, {flag, events: this.downloadEvents, defaultStartOptions});
    return c;
  }

  /**
     * Get manga from key
     * @param {MangaLibKeys} mangaKey
     * @return {MangaLib}
     */
  public getManga(mangaKey:MangaLibKeys):MangaLib {
    const m = this.mangas[mangaKey];

    if (typeof(m)=='undefined') throw new Error(`The manga_key '${mangaKey}' isn't exist in ${this.website}'lib`);
    return m;
  }
  /*
        Manage events
    */
  /**
     *   Set a callback when a download's page finished
     * @param {Manladag.Download.Events.onDonwloadPageFinishedListener} listener
     * @return {this}
     */
  public setOnDownloadPageFinishedListener(listener: Manladag.Download.Events.onDonwloadPageFinishedListener) {
    this.downloadEvents['download-page-finished'] = listener;
    return this;
  }

  /**
     *  Set a callback when a download's page started
     * @param {Manladag.Download.Events.onDonwloadPageStartedListener} listener
     * @return {this}
     */
  public setOnDownloadPageStartedListener(listener: Manladag.Download.Events.onDonwloadPageStartedListener) {
    this.downloadEvents['download-page-started'] = listener;
    return this;
  }

  /**
     *  Set a callback when a download's page throw Error
     * @param {Manladag.Download.Events.onDonwloadPageErrorListener} listener
     * @return {this}
     */
  public setOnDownloadPageErrorListener(listener: Manladag.Download.Events.onDonwloadPageErrorListener) {
    this.downloadEvents['download-page-error'] = listener;
    return this;
  }

  /**
     *  Set a callback when a download's chapter started
     * @param {Manladag.Download.Events.onDonwloadChapterStartedListener} listener
     * @return {this}
     */
  public setOnDownloadChapterStartedListener(listener: Manladag.Download.Events.onDonwloadChapterStartedListener) {
    this.downloadEvents['download-chapter-started'] = listener;
    return this;
  }

  /**
     *  Set a callback when a download's chapter finished
     * @param {Manladag.Download.Events.onDonwloadChapterFinishedListener} listener
     * @return {this}
     */
  public setOnDownloadChapterFinishedListener(listener: Manladag.Download.Events.onDonwloadChapterFinishedListener) {
    this.downloadEvents['download-chapter-finished'] = listener;
    return this;
  }

  /**
     *  Set a callback when a download's chapter throw Error
     * @param {Manladag.Download.Events.onDonwloadChapterErrorListener} listener
     * @return {this}
     */
  public setOnDownloadChapterErrorListener(listener:Manladag.Download.Events.onDonwloadChapterErrorListener):this {
    this.downloadEvents['download-chapter-error'] = listener;
    return this;
  }

  /**
     *  Set a callback when a download's chapter aborted
     * @param {Manladag.Download.Events.onDonwloadChapterAbortedListener} listener
     * @return {this}
     */
  public setOnDonwloadChapterAbortedListener(listener: Manladag.Download.Events.onDonwloadChapterAbortedListener) {
    this.downloadEvents['download-chapter-aborted'] = listener;
    return this;
  }

  /**
     *  Set a callback when a download's chapter restarted
     * @param {Manladag.Download.Events.onDonwloadPageRestartedListener} listener
     * @return {this}
     */
  public setOnDonwloadPageRestartedListener(listener: Manladag.Download.Events.onDonwloadPageRestartedListener) {
    this.downloadEvents['download-page-restarted'] = listener;
    return this;
  }
}
