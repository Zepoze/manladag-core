
import Path from 'path';
import fs from 'fs';

import {downloadImage, DownloadImageController} from './downloadImage';
import {Manladag, ChapterDownloaderFlags} from '.';
import {
  argsOnDonwloadChapterErrorListener,
  argsOnDonwloadChapterAbortedListener,
  argsOnDonwloadChapterFinishedListener,
  argsOnDonwloadPageRestartedListener,
  argsOnDonwloadChapterStartedListener,
  argsOnDonwloadPageErrorListener,
  argsOnDonwloadPageFinishedListener,
  argsOnDonwloadPageStartedListener,
  StartOptions, ClearfilesOptions,
  MlagPartialOptions,
  ChapterMeta,
} from './manladag-namespace';

import EventEmitter from 'events';
import MlagZip from './mlagZip';

/**
 * An instance can control beahvior of a download
 * restart if failed
 * , abort
 * , etc ...
 */
export class ChapterDownloader extends EventEmitter.EventEmitter implements ChapterMeta {
  readonly dirDownload:string
  readonly manga:Manladag.LibManga
  readonly chapter:number
  readonly website: string
  readonly url: string
  readonly pagesUrl: string[]
  private state: ChapterDownloaderFlags.STATE = ChapterDownloaderFlags.STATE.WAITING_TO_START
  private _retryCount = 0
  private _maxRetryCount = 0
  private currentDownloadController?:DownloadImageController;
  private defaultStartOptions?:StartOptions

  constructor(
      chapterMeta:Required<ChapterMeta>,
      dirDownload:string,
      opts: {
        events?: Partial<Manladag.DownloadEvents>,
        flag?:ChapterDownloaderFlags.INIT,
        defaultStartOptions?:StartOptions
      },
  ) {
    super();
    this.website = chapterMeta.website;
    this.url = chapterMeta.url;
    this.pagesUrl = chapterMeta.pagesUrl;
    this.manga = chapterMeta.manga;
    this.chapter = chapterMeta.chapter;
    this.dirDownload = dirDownload;

    this.defaultStartOptions = opts.defaultStartOptions;

    const flag = opts.flag ?? ChapterDownloaderFlags.INIT.NONE;

    if (opts.events && (~flag & ChapterDownloaderFlags.INIT.CLEAR_EVENTS)) {
      if (opts.events['download-page-started']) this.setOnDownloadPageStartedListener(opts.events['download-page-started']);
      if (opts.events['download-page-finished']) this.setOnDownloadPageFinishedListener(opts.events['download-page-finished']);
      if (opts.events['download-page-error']) this.setOnDownloadPageErrorListener(opts.events['download-page-error']);
      if (opts.events['download-chapter-started']) this.setOnDownloadChapterStartedListener(opts.events['download-chapter-started']);
      if (opts.events['download-chapter-finished']) this.setOnDownloadChapterFinishedListener(opts.events['download-chapter-finished']);
      if (opts.events['download-chapter-error'] ) this.setOnDownloadChapterErrorListener(opts.events['download-chapter-error']);
      if (opts.events['download-chapter-aborted']) this.setOnDownloadChapterAbortedListener(opts.events['download-chapter-aborted']);
      if (opts.events['download-page-restarted']) this.setOnDownloadPageRestartedListener(opts.events['download-page-restarted']);
    }

    if (flag & ChapterDownloaderFlags.INIT.AUTO_START ) {
      this.start(opts.defaultStartOptions);
    };
  }


  get maxRetryCount() {
    return this._maxRetryCount;
  }
  get retryCount() {
    return this._retryCount;
  }

  private _downloadImage(url:string, path:string) {
    this.currentDownloadController = new DownloadImageController(path);
    return downloadImage(url, this.currentDownloadController);
  }

  private async downloadImage(index:number):Promise<void> {
    const pageCount = this.pagesUrl.length;
    const path = this.getPageUrlPath(index);
    const source = this.website;
    const chapter = this.chapter;
    const manga = this.manga.name;
    const page = index+1;

    const defaultArg = {
      pageCount,
      path,
      source,
      chapter,
      manga,
      page,
    };

    try {
      const args:argsOnDonwloadPageStartedListener = defaultArg;
      this.emit('download-page-started', args);

      await this._downloadImage(this.pagesUrl[index], path);

      const argspf:argsOnDonwloadPageFinishedListener = defaultArg;
      this.emit('download-page-finished', argspf);
    } catch (error:any) {
      if (this._retryCount<this._maxRetryCount) {
        this._retryCount++;

        const agrs:argsOnDonwloadPageRestartedListener = {
          ...defaultArg,
          error,
          maxRetryCount: this._maxRetryCount,
          retryCount: this._retryCount,
        };
        this.emit('download-page-restarted', agrs);
        return await this.downloadImage(index);
      } else {
        const argspe:argsOnDonwloadPageErrorListener = {
          ...defaultArg,
          error,
        };
        this.emit('download-page-error', argspe);
        throw error;
      }
    }
  }

  private _clearFiles() {
    for (let i = 0; i<this.pagesUrl.length; i++) {
      try {
        fs.unlinkSync(this.getPageUrlPath(i));
      } catch (e:any) {
        continue;
      }
    }
  }

  /**
   *
   * @param {Object} opts
   * @param {Object} opts.mlag
   * @param {string} opts.mlag.path if the param is a folder the mlag file will be created in the folder with default name
   * @returns
   */

  public async start(opts?:StartOptions) {
    const options = opts ?? this.defaultStartOptions;
    if (this.state ==ChapterDownloaderFlags.STATE.WAITING_TO_START ||this.state == ChapterDownloaderFlags.STATE.FINISHED) {
      this.reset(opts?.maxRetryCount);
    };

    if (this.state ==ChapterDownloaderFlags.STATE.WAITING_TO_START ||this.state == ChapterDownloaderFlags.STATE.FINISHED) {
      this.state = ChapterDownloaderFlags.STATE.STARTED;

      try {
        const done = await this._start(options?.clearFiles, options?.mlag) == ChapterDownloaderFlags.ACTION.DONE;
        this.reset(this._maxRetryCount);
        if (done) {
          this.state = ChapterDownloaderFlags.STATE.FINISHED;
          return ChapterDownloaderFlags.ACTION.DONE;
        } else {
          this.state = ChapterDownloaderFlags.STATE.WAITING_TO_START;
          return ChapterDownloaderFlags.ACTION.NOT_DONE;
        }
      } catch (e:any) {
        this.reset(this._maxRetryCount);
        this.state = ChapterDownloaderFlags.STATE.WAITING_TO_START;
        throw e;
      }
    } else return ChapterDownloaderFlags.ACTION.NOT_DONE;
  }

  private async _start(clearFiles:ClearfilesOptions = {onError: true, onFinish: false}, mlag?:MlagPartialOptions) {
    const pageCount = this.pagesUrl.length;
    const path = this.dirDownload;
    const source = this.website;
    const chapter = this.chapter;
    const manga = this.manga.name;

    const defaultArg = {
      pageCount,
      path,
      source,
      chapter,
      manga,
    };

    const args:argsOnDonwloadChapterStartedListener = defaultArg;
    this.emit('download-chapter-started', args);

    try {
      for (let i =0; i<pageCount; i++) {
        if (this.state == ChapterDownloaderFlags.STATE.WAITING_TO_ABORT) {
          throw new Error('force abort');
        }
        await this.downloadImage(i);
      }
      if (mlag) {
        MlagZip.createMlagFile({
          website: this.website,
          chapter,
          manga: this.manga,
          url: this.url,
          pagesPath: this.pagesUrl.map((val, index)=> this.getPageUrlPath(index)),
        }, mlag);
      }
      if (clearFiles.onFinish) {
        this._clearFiles();
      }
      const args:argsOnDonwloadChapterFinishedListener = defaultArg;

      this.emit('download-chapter-finished', args);
      return ChapterDownloaderFlags.ACTION.DONE;
    } catch (error:any) {
      if (this.state == ChapterDownloaderFlags.STATE.WAITING_TO_ABORT) {
        const args:argsOnDonwloadChapterAbortedListener = defaultArg;
        this.emit('download-chapter-aborted', args);
        return ChapterDownloaderFlags.ACTION.NOT_DONE;
      }

      if (clearFiles.onError) {
        this._clearFiles();
      }
      const args:argsOnDonwloadChapterErrorListener = {...defaultArg, error};
      this.emit('download-chapter-error', args);
      throw error;
    }
  }


  public abort():Promise<ChapterDownloaderFlags.ACTION> {
    if (this.state != ChapterDownloaderFlags.STATE.STARTED) return Promise.resolve(ChapterDownloaderFlags.ACTION.NOT_DONE);
    return new Promise((resolve, reject) => {
      this.once('download-chapter-aborted', resolve.bind(null, ChapterDownloaderFlags.ACTION.DONE));

      this.state = ChapterDownloaderFlags.STATE.WAITING_TO_ABORT;
      this.currentDownloadController?.abort(new Error('dowload aborted'));
    });
  }

  public getPageUrlPath(pageUrlIndex:number) {
    let ext = Path.extname(Path.basename(this.pagesUrl[pageUrlIndex]));
    ext = (ext=='.jpg'||ext=='.png')? `${ext}`:'.jpg';
    return Path.join(this.dirDownload, (pageUrlIndex<10 ? `0${pageUrlIndex+ext}`: `${pageUrlIndex+ext}`));
  }


  /**
   * Get the state of the download
   * @return {ChapterDownloaderFlags.STATE}
   */
  public getState() {
    return this.state;
  }


  public emit<T extends keyof Manladag.DownloadEvents>(event: T, ...arg:Parameters<Manladag.DownloadEvents[T]>):boolean;
  public emit(event: string | symbol, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }

  public once<T extends keyof Manladag.DownloadEvents>(event: T, listener: Manladag.DownloadEvents[T]):this;
  public once(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.once(event, listener);
  }

  public on<T extends keyof Manladag.DownloadEvents>(event: T, listener: Manladag.DownloadEvents[T]):this;
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public removeAllListeners(event:keyof Manladag.DownloadEvents):this;
  public removeAllListeners(event?: string | symbol | undefined): this {
    return super.removeAllListeners(event);
  }

  public removeListener<T extends keyof Manladag.DownloadEvents>(event:T, listener: Manladag.DownloadEvents[T]):this;
  public removeListener(event: string | symbol, listener: (...args: any[]) => void):this {
    return super.removeListener(event, listener);
  }


  // SETTERS EVENTS


  /**
   *   Set a callback when a download's page finished
   * @param {Manladag.Download.Events.onDonwloadPageFinishedListener} listener
   * @return {this}
   */
  public setOnDownloadPageFinishedListener(listener: Manladag.Download.Events.onDonwloadPageFinishedListener) {
    return this.on('download-page-finished', listener);
  }

  /**
   *  Set a callback when a download's page started
   * @param {Manladag.Download.Events.onDonwloadPageStartedListener} listener
   * @return {this}
   */
  public setOnDownloadPageStartedListener(listener: Manladag.Download.Events.onDonwloadPageStartedListener) {
    return this.on('download-page-started', listener);
  }

  /**
   *  Set a callback when a download's page throw Error
   * @param {Manladag.Download.Events.onDonwloadPageErrorListener} listener
   * @return {this}
   */
  public setOnDownloadPageErrorListener(listener: Manladag.Download.Events.onDonwloadPageErrorListener):this {
    return this.on('download-page-error', listener);
  }

  /**
   *  Set a callback when a download's chapter started
   * @param {Manladag.Download.Events.onDonwloadChapterStartedListener} listener
   * @return {this}
   */
  public setOnDownloadChapterStartedListener(listener: Manladag.Download.Events.onDonwloadChapterStartedListener): this {
    return this.on('download-chapter-started', listener);
  }

  /**
   *  Set a callback when a download's chapter finished
   * @param {Manladag.Download.Events.onDonwloadChapterFinishedListener} listener
   *
   * @return {this}
   */
  public setOnDownloadChapterFinishedListener(listener: Manladag.Download.Events.onDonwloadChapterFinishedListener) {
    return this.on('download-chapter-finished', listener);
  }

  /**
   *  Set a callback when a download's chapter throw Error
   * @param {Manladag.Download.Events.onDonwloadChapterErrorListener} listener
   * @return {this}
   */
  public setOnDownloadChapterErrorListener(listener:Manladag.Download.Events.onDonwloadChapterErrorListener) {
    return this.on('download-chapter-error', listener);
  }

  /**
   *  Set a callback when a download's chapter aborted
   * @param {Manladag.Download.Events.onDonwloadChapterAbortedListener} listener
   * @return {this}
   */
  public setOnDownloadChapterAbortedListener(listener: Manladag.Download.Events.onDonwloadChapterAbortedListener) {
    return this.on('download-chapter-aborted', listener);
  }

  /**
   *  Set a callback when a download's chapter restarted
   * @param {Manladag.Download.Events.onDonwloadPageRestartedListener} listener
   * @return {this}
   */
  public setOnDownloadPageRestartedListener(listener: Manladag.Download.Events.onDonwloadPageRestartedListener) {
    return this.on('download-page-restarted', listener);
  }

  private reset(maxRetryCount = 0) {
    this._retryCount = 0;
    this._maxRetryCount = maxRetryCount;
  }
}
