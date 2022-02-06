interface defaultArg {
  manga:string,
  path:string,
  pageCount:number,
  source:string,
  chapter:number
}

export interface WebsiteMeta {
  website:string,
  url:string
}

export interface ChapterMeta extends WebsiteMeta {
  chapter:number,
  manga:Manladag.LibManga,
  pagesUrl?: string[]
}

interface defaultArgWithError extends defaultArg {
  error:any
}

interface defaultArgWithPage extends defaultArg {
  page:number,
}

export interface argsOnDonwloadChapterStartedListener extends defaultArg {}

export interface argsOnDonwloadChapterFinishedListener extends defaultArg {}

export interface argsOnDonwloadChapterAbortedListener extends defaultArg {}

export interface argsOnDonwloadChapterErrorListener extends defaultArgWithError {}


export interface argsOnDonwloadPageStartedListener extends defaultArgWithPage {}

export interface argsOnDonwloadPageFinishedListener extends defaultArgWithPage {}

export interface argsOnDonwloadPageErrorListener extends defaultArgWithPage, defaultArgWithError {}


export interface argsOnDonwloadPageRestartedListener extends defaultArgWithPage, defaultArgWithError {
  retryCount:number
  maxRetryCount:number
}

export interface StartOptions {
  clearFiles?:ClearfilesOptions,
  mlag?: MlagPartialOptions
  maxRetryCount?:number
}

export interface ClearfilesOptions {
  onError?:boolean,
  onFinish?:boolean
}

export interface MlagOptions {
  path:string,
  writeOperation:MlagWriteOperation
}

export type MlagPartialOptions = Omit<MlagOptions, 'writeOperation'> & Partial<Pick<MlagOptions, 'writeOperation'>>

export type MlagWriteOperation = 'override' | 'rename'


export namespace Manladag {
  export namespace Download {
    export namespace Events {
      export interface onDonwloadPageStartedListener {
        (args:argsOnDonwloadPageStartedListener ): void
      }
      export interface onDonwloadPageFinishedListener{
        ( args: argsOnDonwloadPageFinishedListener ): void
      }
      export interface onDonwloadPageErrorListener{
        ( args:argsOnDonwloadPageErrorListener ): void
      }
      export interface onDonwloadChapterStartedListener{
        ( args:argsOnDonwloadChapterStartedListener ): void
      }
      export interface onDonwloadChapterFinishedListener{
        ( args:argsOnDonwloadChapterFinishedListener ): void
      }
      export interface onDonwloadChapterAbortedListener{
        ( args:argsOnDonwloadChapterAbortedListener ): void
      }
      export interface onDonwloadChapterErrorListener{
        ( args:argsOnDonwloadChapterErrorListener ): void
      }
      export interface onDonwloadPageRestartedListener{
        ( args:argsOnDonwloadPageRestartedListener ): void
      }
    }
  }
  export interface DownloadEvents {
    'download-page-started': Manladag.Download.Events.onDonwloadPageStartedListener,
    'download-page-finished': Manladag.Download.Events.onDonwloadPageFinishedListener,
    'download-page-error': Manladag.Download.Events.onDonwloadPageErrorListener,
    'download-page-restarted': Manladag.Download.Events.onDonwloadPageRestartedListener
    'download-chapter-started': Manladag.Download.Events.onDonwloadChapterStartedListener,
    'download-chapter-finished': Manladag.Download.Events.onDonwloadChapterFinishedListener,
    'download-chapter-error': Manladag.Download.Events.onDonwloadChapterErrorListener,
    'download-chapter-aborted': Manladag.Download.Events.onDonwloadChapterAbortedListener,

  }
  export interface MlagManifestProperties<Version extends string> extends Omit<ChapterMeta, 'pagesUrl'> {
    pageCount: number,
    'download-date': string,
    'version': Version
  }
  export interface LibManga {
    name: string
  }

  export type LibCore<LibManga extends Manladag.LibManga = Manladag.LibManga, MangaLibKeys extends string = string> = WebsiteMeta & CoreFunc<LibManga> & {
    // eslint-disable-next-line no-unused-vars
    mangas: {[key in MangaLibKeys]: LibManga},
  }

  export type LibCoreExtended<OptionalFunc extends keyof OptionalCoreFunc<LibManga>, LibManga extends Manladag.LibManga = Manladag.LibManga, MangaLibKeys extends string = string> =
  Manladag.LibCore<LibManga, MangaLibKeys> & Pick<OptionalCoreFunc<LibManga>, OptionalFunc>

}


export type ArgBaseCoreFunc<LibManga extends Manladag.LibManga> = [LibManga, ... readonly any[]]
export type BaseCoreFunc<LibManga extends Manladag.LibManga> = (...args:ArgBaseCoreFunc<LibManga>)=>Promise<unknown>;
// eslint-disable-next-line no-unused-vars
export type ObjectBaseCoreFunc<LibManga extends Manladag.LibManga, Keys extends string = string> = {[key in Keys]:BaseCoreFunc<LibManga>}

export interface CoreFunc<MangaLib extends Manladag.LibManga = Manladag.LibManga> {
  getNumberPageChapter(manga:MangaLib, chapter:number):Promise<number>,
  getUrlPages(manga:MangaLib, chapter:number):Promise<string[]>,
  getLastChapter(manga:MangaLib):Promise<number>,
  chapterIsAvailable(manga:MangaLib, chapter:number) : Promise<boolean>,
}

export interface OptionalCoreFunc<MangaLib extends Manladag.LibManga = Manladag.LibManga> {
  getChaptersAvailable(manga:MangaLib, fromChapter:number, toChapter:number): Promise<number[]>
}
