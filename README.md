# @manladag/core
  [![npm version](https://badge.fury.io/js/@manladag%2Fcore.svg)](https://www.npmjs.com/package/@manladag/core)
  [![Build Status](https://app.travis-ci.com/Zepoze/manladag-core.svg?branch=main)](https://app.travis-ci.com/Zepoze/manladag-core)
  [![Coverage Status](https://coveralls.io/repos/github/Zepoze/manladag-core/badge.svg?branch=main)](https://coveralls.io/github/Zepoze/manladag-core?branch=main)
# But what is it ?
Manladag core is used to download your favorite manga

# Example

~~~~typescript

import {Lib as GoodLib} from 'a-good-lib'
import { ManladagSource, ChapterDownloaderFlags } from '@manladag/core'

const mdg = new ManladagCore(GoodLib);

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

~~~~

In this example the library Source Lelscan was used to download the last chapter of One Piece available on his website into a `.mlag` file inside the folder `__dirname` 



# Manladag's Lib



- [Github/manladag-lelscanv](https://github.com/Zepoze/manladag-lelscanv) -> [Web](https://lelscanv.com/)

>Your favorite library is missing ? create your own lib !

>Visit the lib/example folder



# ManladagSource API
Visit the [api web][1]


[1]: https://manladag.surge.sh