// Check that you have an internet connection
import {ChapterDownloaderFlags,ManladagCore} from "../lib"

import {Lib as MyLib} from "./myLib"

const mdg = new ManladagCore(MyLib);

mdg
    .setOnDownloadChapterStartedListener(() => {
      console.log('Download has started !');
    })
    .setOnDownloadPageFinishedListener(({page, pageCount}) => {
      console.log(`${page}/${pageCount}`);
    })
    .setOnDownloadChapterFinishedListener(() => {
      console.log('Download has finished !');
    }).
    getLastChapter('one-piece').then((chapter) => {
      mdg.createChapterDownloader('one-piece', chapter, __dirname, ChapterDownloaderFlags.INIT.AUTO_START, {
        clearFiles: {onFinish: true, onError: true},
        mlag: {path: __dirname},
      });
    });
