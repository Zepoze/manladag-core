import AdmZip from 'adm-zip';
import fs from 'fs';
import Path from 'path';
import {ChapterMeta, Manladag, MlagPartialOptions, MlagWriteOperation} from './manladag-namespace';

type Version = '0.0.1'

export default class MlagZip extends AdmZip implements Manladag.MlagManifestProperties<string> {
    public pageCount:number;
    public version:string;
    public chapter:number;
    public manga:Manladag.LibManga;
    public url:string;
    public website:string;
    public 'download-date':string

    constructor(filename:string) {
      super(filename);
      let tmp;

      try {
        tmp = JSON.parse(this.readAsText('manifest.json'));
      } catch (e) {
        throw new Error(filename+' is not a mlag file');
      }

      const infos:Partial<Manladag.MlagManifestProperties<Version>> = tmp;

      if (infos['download-date'] && infos['version'] && infos.pageCount && infos.chapter && infos.manga && infos.website && infos.url) {
        this.pageCount = infos.pageCount;
        this.chapter = infos.chapter;
        this.version = infos.version;
        this['download-date'] = infos['download-date'];
        this.manga = infos.manga;
        this.website = infos.website;
        this.url = infos.url;
      } else {
        throw new Error(filename+' mlag file is corrupted');
      }
    }

    static version:Version = '0.0.1'
    /**
     * This method is an helper to determine the future name of the mlag file
     * @param {Omit<ChapterMeta, 'pagesUrl'>} chapterMeta
     * @param {string} path can be a filename (with a mlag extension or not) who exist (or not) or the path can be a directory who exist
     * @param {MlagWriteOperation} writeOperation
     * @return {string}
     */
    static resolveMlagPath(chapterMeta:Omit<ChapterMeta, 'pagesUrl'>, path:string, writeOperation:MlagWriteOperation = 'rename'):string {
      function findFile(base:string) {
        if (Path.extname(path) == '.mlag') {
          base = path.slice(0, path.length-5);
        }
        let filename:string = base + '.mlag';
        let i = 1;
        while (fs.existsSync(filename)) {
          filename = base + `(${i}).mlag`;
          i++;
        }
        return filename;
      }

      if (fs.existsSync(path)) {
        let base:string;
        if (fs.lstatSync(path).isDirectory()) {
          const website = chapterMeta.website.toLowerCase();
          const mname = chapterMeta.manga.name.toLowerCase();
          const chapter = chapterMeta.chapter;

          base = Path.join(path, `${website}-${mname}-${chapter}`);
        } else {
          base = path;
        }
        switch (writeOperation) {
          case 'rename':
            return findFile(base);
          case 'override':
          default:
            if (Path.extname(base) != '.mlag') {
              base = base+'.mlag';
            }
            return base;
        }
      } else if (fs.existsSync(Path.join(path, '..'))) {
        if (writeOperation == 'override') {
          return path + (Path.extname(path) == '.mlag' ? '' : '.mlag');
        }
        return findFile(path);
      } else {
        throw new Error(`Folder ${Path.join(path, '..')} doesn't exist`);
      }
    }
    static createMlagFile(chapterMeta:Omit<ChapterMeta, 'pagesUrl'> & {pagesPath:string[]}, mlagOpts:MlagPartialOptions) {
      const infos:Manladag.MlagManifestProperties<Version> = {
        'website': chapterMeta.website,
        'url': chapterMeta.url,
        'manga': {name: chapterMeta.manga.name},
        'chapter': chapterMeta.chapter,
        'download-date': ((date:number) => {
          const d = new Date(date);
          let month = '' + (d.getMonth() + 1);
          let day = '' + d.getDate();
          const year = d.getFullYear();

          if (month.length < 2) {
            month = '0' + month;
          }
          if (day.length < 2) {
            day = '0' + day;
          }

          return [year, month, day].join('-');
        })(Date.now()),
        'pageCount': chapterMeta.pagesPath.length,
        'version': '0.0.1',
      };

      const zip = new AdmZip();
      zip.addFile('manifest.json', Buffer.from(JSON.stringify(infos, null, '\t')), 'Manifest Entry');
      (zip as any).addFile('pages/', Buffer.from('lol'));
      for (let i = 0; i<chapterMeta.pagesPath.length; i++) {
        zip.addLocalFile(chapterMeta.pagesPath[i], 'pages');
      }
      zip.writeZip(MlagZip.resolveMlagPath(chapterMeta, mlagOpts.path, mlagOpts.writeOperation));
    }
}
