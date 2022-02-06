import path from 'path';
import sinon from 'sinon';
import {Manladag} from '../lib';
import {OptionalCoreFunc} from '../lib/manladag-namespace';


export const port:number = 8000;

export const host = `http://127.0.0.1:${port}`;

export const urlToImage = host+'/image';
export const urlToTextTimeout = host+'/text/timeout';

export const pagesFolder = path.join(__dirname, 'pages');

const getChaptersAvailable = sinon.fake.resolves(Array(10).fill('').map((val, index) => 900+index));

export const cleanLibWithoutOptionalFunc:Manladag.LibCore<Manladag.LibManga, 'one-piece'> = {
  chapterIsAvailable: async function(a, chapter) {
    return (await getChaptersAvailable()).includes(chapter);
  },
  getLastChapter: sinon.fake.resolves(909),
  getNumberPageChapter: sinon.fake.resolves(17),
  getUrlPages: sinon.fake.resolves(new Array(21).fill(urlToImage)),
  mangas: {
    'one-piece': {
      name: 'One Piece',
    },
  },
  website: 'Example',
  url: host,
};

export const cleanLib:Manladag.LibCoreExtended<'getChaptersAvailable', Manladag.LibManga, 'one-piece'> = {
  ...cleanLibWithoutOptionalFunc,
  getChaptersAvailable,
};

export const errorLib:typeof cleanLib = {...cleanLib,
  getChaptersAvailable: sinon.fake.throws('error'),
  getLastChapter: sinon.fake.throws('error'),
  getNumberPageChapter: sinon.fake.throws('error'),
  getUrlPages: sinon.fake.throws('error'),
  chapterIsAvailable: sinon.fake.throws('error'),
};

export const AllOptionsalFunc:[keyof OptionalCoreFunc<Manladag.LibManga>] = [
  'getChaptersAvailable',
];
