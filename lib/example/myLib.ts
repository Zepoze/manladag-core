import {Manladag} from '../index';
// replace '../lib/index' with '@manladag/core'
interface MyLibManga extends Manladag.LibManga {
  colorType: 'classic' | 'fullColor'
  // any attribute you need
}

// mangas supported
const allYourLibMangas = {
  'one-piece': {
    name: 'One Piece',
    colorType: 'classic',
  },
  'solo-leveling': {
    name: 'Solo Leveling',
    colorType: 'classic',
  },
} as const;

type Keys = keyof typeof allYourLibMangas

const getChaptersAvailable = () => {
  return Promise.resolve(Array(10).fill('').map((val, index) => 1+index));
};

export const Lib:Manladag.LibCoreExtended<'getChaptersAvailable', MyLibManga, Keys> = {
  website: 'Picsum',
  url: 'https://picsum.photos',
  getLastChapter() {
    return Promise.resolve(10);
  },
  getNumberPageChapter() {
    return Promise.resolve(10);
  },
  mangas: allYourLibMangas,
  async chapterIsAvailable(manga, chapter) {
    return Promise.resolve((await getChaptersAvailable()).includes(chapter));
  },
  getUrlPages(manga, chapter) {
    return Promise.resolve(Array(10).fill('0').map(()=>'https://picsum.photos/800/1600'));
  },
  getChaptersAvailable,

};
