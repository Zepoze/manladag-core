/* eslint-disable no-invalid-this */

import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import chaiFs from 'chai-fs';
import chai from 'chai';
import {downloadImage, DownloadImageController} from '../lib/downloadImage';
import path, {join} from 'path';
import {Server} from 'http';
import getServer, {imageTimeout} from './server';
import {existsSync, mkdirSync, writeFileSync, readFileSync} from 'fs';
import rimraf from 'rimraf';
import {pagesFolder, port, urlToImage, urlToTextTimeout, cleanLib, errorLib, cleanLibWithoutOptionalFunc, AllOptionsalFunc} from './env';
import {ManladagCore, MlagZip, ChapterDownloaderFlags} from '../lib';
import Sinon from 'sinon';
import {ManladagLibError} from '../lib/ManladagLibError';
import {ChapterDownloader} from '../lib/chapterDownloader';
import {argsOnDonwloadChapterErrorListener, argsOnDonwloadChapterStartedListener, argsOnDonwloadPageErrorListener, argsOnDonwloadPageRestartedListener, argsOnDonwloadPageStartedListener, ChapterMeta, Manladag} from '../lib/manladag-namespace';


chai.use(sinonChai);
chai.use(chaiFs);
chai.use(chaiAsPromised);

const expect = chai.expect;

const testManladagCore = new ManladagCore(cleanLib);
const errorCore = new ManladagCore(errorLib);

const testMcSandbox = Sinon.createSandbox();
const errorSandbox = Sinon.createSandbox();

testMcSandbox.spy(testManladagCore);
errorSandbox.spy(errorCore);

describe('Mlagger', function() {
  const resolverPath = join(__dirname, 'resolver');
  const extractedPath = join(resolverPath, '../extracted');
  const mlaggerPath = join(__dirname, 'mlagger');

  const chapter = 900;
  const website = 'Wow';
  const mname = 'One Piece';
  const chapMeta:ChapterMeta = {
    chapter,
    manga: {name: mname},
    url: 'http://example.fr',
    website,
  };

  function simWrite(path:string) {
    writeFileSync(path, path);
    return path;
  }

  describe('Mlag path resolver', function() {
    before(function() {
      if (existsSync(resolverPath)) rimraf.sync(resolverPath);
      mkdirSync(resolverPath);
    });
    after(function() {
      if (existsSync(resolverPath)) rimraf.sync(resolverPath);
    });
    it('path isn\'t valid', function() {
      expect(MlagZip.resolveMlagPath.bind(this, chapMeta, '/home/I believe/I can/fly')).to.throw();
    });
    it('path file who doesn\'t exist', function() {
      const base = join(resolverPath, 'test');
      const wantedPath = base+'.mlag';

      expect(MlagZip.resolveMlagPath(chapMeta, base, 'override')).to.be.eq(wantedPath);
      expect(MlagZip.resolveMlagPath(chapMeta, wantedPath, 'override')).to.be.eq(wantedPath);
    });
    it('path dir who exists', function() {
      const base = resolverPath;
      const wantedPath = base + `/${website.toLowerCase()}-${mname.toLowerCase()}-${chapter}.mlag`;

      expect(MlagZip.resolveMlagPath(chapMeta, base, 'override')).to.be.eq(wantedPath);
      expect(MlagZip.resolveMlagPath(chapMeta, wantedPath, 'override')).to.be.eq(wantedPath);
    });
    it('mlag file already exist', function() {
      const base = resolverPath + `/${website.toLowerCase()}-${mname.toLowerCase()}-${chapter}`;
      const basePath = base+'.mlag';
      const wantedPath = base+'(1).mlag';
      simWrite(basePath);

      expect(MlagZip.resolveMlagPath(chapMeta, basePath, 'override')).to.be.eq(basePath);

      expect(MlagZip.resolveMlagPath(chapMeta, base)).to.be.eq(wantedPath);
      expect(MlagZip.resolveMlagPath(chapMeta, basePath)).to.be.eq(wantedPath);
      expect(MlagZip.resolveMlagPath(chapMeta, resolverPath)).to.be.eq(wantedPath);
    });
  });
  describe('Mlag file maker', function() {
    let filesPath :string[];
    const zip = join(mlaggerPath, 'main.mlag');
    let manifestExpected:Manladag.MlagManifestProperties<typeof MlagZip.version>;

    before(function() {
      if (existsSync(mlaggerPath)) rimraf.sync(mlaggerPath);
      mkdirSync(mlaggerPath);
      if (existsSync(extractedPath)) rimraf.sync(extractedPath);

      filesPath = Array(5).fill(1).map((e, index)=> simWrite(join(mlaggerPath, `${index}.txt`)));
      manifestExpected = {
        ...chapMeta,
        'pageCount': filesPath.length,
        'version': MlagZip.version,
        'download-date': '2022-02-03',
      };

      Sinon.replace(Date, 'now', () => new Date(2022, 1, 3).valueOf());
      MlagZip.createMlagFile({...chapMeta, pagesPath: filesPath}, {path: zip});
      new MlagZip(zip).extractAllTo(extractedPath);
    });
    after(function() {
      if (existsSync(mlaggerPath)) rimraf.sync(mlaggerPath);
      if (existsSync(extractedPath)) rimraf.sync(extractedPath);

      Sinon.restore();
    });
    it('Inspect mlag file', function() {
      const manifest = JSON.parse(readFileSync(join(extractedPath, 'manifest.json')).toString());
      expect(manifest).to.be.deep.eq(manifestExpected);
    });
    it('Inspect mlag file with adm-zip', function() {
      expect(new MlagZip(zip)).to.be.deep.include(manifestExpected);
    });
  });
});
describe('download image', function() {
  let server:Server;
  this.beforeAll(function(done) {
    rimraf.sync(pagesFolder);
    getServer(port).then((s) => {
      server = s;
      done();
    });
  });
  this.afterAll(function(done) {
    this.timeout(5000);
    rimraf.sync(pagesFolder);
    if (server) {
      return server.close(done);
    } else return done();
  });
  beforeEach(function() {
    imageTimeout(0);
    mkdirSync(pagesFolder);
  });

  afterEach(function() {
    rimraf.sync(pagesFolder);
  });


  it('correct download', function(done) {
    this.timeout(2000);
    this.slow(100);
    const imagePath = path.join(pagesFolder, '01.jpg');
    // setTimeout(()=> ab.abort(), 2000);
    expect(expect(downloadImage(
        urlToImage,
        new DownloadImageController(imagePath),
    )).to.be.fulfilled.then(() => {
      expect(imagePath).to.be.file();
    })).to.notify(done);
  });

  it('error response timeout', function(done) {
    this.slow(11100);
    this.timeout(imageTimeout(11000)+5000);
    const textPath = path.join(pagesFolder, 'plain.txt');
    // setTimeout(()=> ab.abort(), 2000);
    expect(expect(
        downloadImage(
            urlToTextTimeout,
            new DownloadImageController(textPath),
        )).to.eventually.be.rejectedWith('timeout').then(()=> expect(textPath).to.not.be.a.path())).notify(done);
  });

  it('cancel download before response', function(done) {
    this.timeout(imageTimeout(2000)+1000);
    const imagePath = path.join(pagesFolder, '01.jpg');
    const d = new DownloadImageController(imagePath);
    d.abort();
    expect(
        expect(downloadImage(urlToImage, d))
            .to.rejected.then(()=> {
              expect(d.isResponsed).eq(false);
              expect(imagePath).to.not.be.a.path();
            })).to.notify(done);
  });

  it('cancel download after response', function(done) {
    this.timeout(imageTimeout(2000)+1000);
    this.slow(2000);
    const imagePath = path.join(pagesFolder, '01.jpg');
    const d = new DownloadImageController(imagePath);

    setTimeout(()=> {
      d.abort();
    }, imageTimeout()-1000);

    expect(expect(downloadImage(
        urlToTextTimeout,
        d))
        .to.be.rejected.then(()=> {
          expect(d.isResponsed).eq(true);
          expect(imagePath).to.not.be.a.path();
        })).to.notify(done);
  });
});

describe('Manladag Core', function() {
  this.beforeAll((done)=> {
    errorSandbox.restore();
    testMcSandbox.restore();
    done();
  });
  this.afterAll((done)=> {
    errorSandbox.restore();
    testMcSandbox.restore();
    done();
  });
  describe('ManladagCore used as bridge of the lib', function() {
    describe('Lib static property', function() {
      it('`site` & `url`', function() {
        expect(testManladagCore.website).to.be.equal(cleanLib.website);
        expect(testManladagCore.url).to.be.equal(cleanLib.url);
      });
      it('`mangas`', function() {
        expect(testManladagCore.mangas).to.deep.equal(cleanLib.mangas);
      });
    });
    describe('Lib functions without error', function() {
      it('`getNumberPageChapter`', function(done) {
        expect(testManladagCore.getNumberPageChapter('one-piece', 900))
            .to.eventually.eq(17).notify(done);
      });
      it('`getUrlPages`', function(done) {
        expect(testManladagCore.getUrlPages('one-piece', 900))
            .to.eventually.have.lengthOf(21).notify(done);
      });
      it('`getLastChapter`', function(done) {
        expect(testManladagCore.getLastChapter('one-piece'))
            .to.eventually.eq(909).notify(done);
      });
      it('`chapterIsAvailable`', function() {
        return Promise.all([
          expect(testManladagCore.chapterIsAvailable('one-piece', 909))
              .to.eventually.eq(true),
          expect(testManladagCore.chapterIsAvailable('one-piece', 910))
              .to.eventually.eq(false),
        ]);
      });
      it('`getChaptersAvailable`', function() {
        return Promise.all([
          expect(testManladagCore.getChaptersAvailable('one-piece', 0, 3000))
              .to.eventually.have.lengthOf(10).then(),
          expect(testManladagCore.getChaptersAvailable(testManladagCore.mangas['one-piece'], 0, 3000))
              .to.eventually.have.lengthOf(10).then(),
        ]);
      });
    });
    describe('Lib with error', function() {
      it('`getNumberPageChapter`', function(done) {
        expect(errorCore.getNumberPageChapter('one-piece', 900))
            .to.eventually.rejectedWith(ManladagLibError).notify(done);
      });
      it('`getUrlPages`', function(done) {
        expect(errorCore.getUrlPages('one-piece', 900))
            .to.eventually.rejectedWith(ManladagLibError).notify(done);
      });
      it('`getLastChapter`', function(done) {
        expect(errorCore.getLastChapter('one-piece'))
            .to.eventually.rejectedWith(ManladagLibError).notify(done);
      });
      it('`chapterIsAvailable`', function(done) {
        expect(errorCore.chapterIsAvailable('one-piece', 200))
            .to.eventually.rejectedWith(ManladagLibError).notify(done);
      });
      it('`getChaptersAvailable`', function(done) {
        expect(errorCore.getChaptersAvailable('one-piece', 0, 3000))
            .to.eventually.rejectedWith(ManladagLibError).notify(done);
      });
    });
    describe('Lib Func implemented', function() {
      AllOptionsalFunc.forEach((e)=> {
        it(`${e} implemented`, function() {
          expect(testManladagCore.implement(e)).to.be.true;
        });
      });
    });
    describe('Lib Func not implemented', function() {
      const _m = new ManladagCore(cleanLibWithoutOptionalFunc);
      AllOptionsalFunc.forEach((e)=> {
        it(`${e} not implemented`, function() {
          expect(_m.implement(e)).to.be.false;
        });
      });
    });
  });
  describe('MaladagCore helper', function() {
    it('`getManga`', function() {
      expect(testManladagCore.getManga('one-piece')).to.deep.equal(cleanLib.mangas['one-piece']);
      expect(()=>testManladagCore.getManga('naruto' as 'one-piece')).to.throw();
    });
  });
  describe('Create Chapter Downloader', function() {
    it('good params', function(done) {
      expect(testManladagCore.createChapterDownloader('one-piece', 900, __dirname)).to.eventually.fulfilled.notify(done);
    });
    describe('bad params', function() {
      it('chapter negative', function(done) {
        expect(testManladagCore.createChapterDownloader('one-piece', -1, __dirname)).to.eventually.rejected.notify(done);
      });
      it('directory is a file', function(done) {
        expect(testManladagCore.createChapterDownloader('one-piece', 900, __dirname+'/test.ts')).to.eventually.rejected.notify(done);
      });
      it('directory doesn\'t exist', function(done) {
        expect(testManladagCore.createChapterDownloader('one-piece', 900, __dirname+'t')).to.eventually.rejected.notify(done);
      });
      it('chapter is  unavailable online', function(done) {
        expect(testManladagCore.createChapterDownloader('one-piece', 910, __dirname)).to.eventually.rejected.notify(done);
      });
    });
  });
});

describe('Chapter downloader', function() {
  let cd:ChapterDownloader;
  let stubDownloadImage: Sinon.SinonStub<any[], any>;
  const fakeChapterStart = testMcSandbox.fake();
  const fakeChapterFinish = testMcSandbox.fake();
  const fakeChapterError = testMcSandbox.fake();
  const fakePageStart = testMcSandbox.fake();
  const fakePageFinish = testMcSandbox.fake();
  const fakePageError = testMcSandbox.fake();
  const fakeChapterAbort = testMcSandbox.fake();
  const fakePageRestart = testMcSandbox.fake();


  testManladagCore.setOnDownloadChapterStartedListener(fakeChapterStart)
      .setOnDownloadChapterFinishedListener(fakeChapterFinish)
      .setOnDownloadChapterErrorListener(fakeChapterError)
      .setOnDownloadPageStartedListener(fakePageStart)
      .setOnDownloadPageFinishedListener(fakePageFinish)
      .setOnDownloadPageErrorListener(fakePageError)
      .setOnDonwloadChapterAbortedListener(fakeChapterAbort)
      .setOnDonwloadPageRestartedListener(fakePageRestart);


  const chapter = 900;
  const key = 'one-piece';
  const manga = cleanLib.mangas[key].name;
  const pageCount = 21;
  const path = pagesFolder;
  const source = cleanLib.website;


  function checkPageCall(spy:Sinon.SinonSpy<any[], any>, times:number) {
    expect(spy.callCount).eq(times);
    for (let page = 1; page<=times; page++) {
      const args:argsOnDonwloadPageStartedListener = {chapter, manga, page, path: cd.getPageUrlPath(page-1), pageCount, source};
      expect(spy.getCall(page-1).args).to.have.lengthOf(1);
      expect(spy.getCall(page-1).args[0]).to.deep.equal(args);
    }
  }

  const allFakes = [
    fakeChapterStart,
    fakeChapterFinish,
    fakeChapterError,
    fakePageStart,
    fakePageFinish,
    fakePageError,
    fakeChapterAbort,
    fakePageRestart,
  ];
  function resetAllHistory() {
    allFakes.forEach((f)=> f.resetHistory());
  }

  this.beforeAll(function(done) {
    this.timeout(10000);
    testMcSandbox.restore();
    mkdirSync(pagesFolder);
    done();
  });
  this.afterAll(function(done) {
    rimraf.sync(pagesFolder);
    done();
  });

  beforeEach(function() {
    testMcSandbox.restore();
  });

  describe('Check handle on donwloads events', function() {
    before(function(done) {
      testManladagCore.createChapterDownloader(key, chapter, pagesFolder).then((d) => {
        cd = d;
        stubDownloadImage = testMcSandbox.stub(cd as any, '_downloadImage').resolves();
        expect(cd.start()).to.eventually.eq(ChapterDownloaderFlags.ACTION.DONE).notify(done);
      });
    });

    it('Chapter\'s download started', function() {
      expect(fakeChapterStart).calledOnce;
      const args:argsOnDonwloadChapterStartedListener = {chapter, manga, pageCount, path, source};
      expect(fakeChapterStart.firstCall).to.have.been.calledWithExactly(args);
    });

    it('Page\'s download started (21 times)', function() {
      expect(fakePageStart.firstCall).to.have.been.calledAfter(fakeChapterStart.lastCall);
      checkPageCall(fakePageStart, 21);
    });

    it('Page\'s download finished (21 times)', function() {
      expect(fakePageFinish.lastCall).to.have.been.calledAfter(fakePageStart.lastCall);
      checkPageCall(fakePageFinish, 21);
    });

    it('Chapter\'s download finished', function() {
      expect(fakeChapterFinish).calledOnce;
      expect(fakeChapterFinish.firstCall).to.have.been.calledAfter(fakePageFinish.lastCall);
      const args:argsOnDonwloadChapterStartedListener = {chapter, manga, pageCount, path, source};
      expect(fakeChapterFinish.firstCall).calledWithExactly(args);
    });

    it('21 image downloaded', function() {
      expect(stubDownloadImage.callCount).eq(21);
    });

    it('No error error', function() {
      expect(fakePageError).not.called;
      expect(fakeChapterError).not.called;
    });

    it('Restart and aborted not called', function() {
      [fakePageRestart, fakeChapterAbort].forEach((spy)=> expect(spy).not.called);
    });
  });

  describe('check error event (error on 18th download)', function() {
    before(function(done) {
      resetAllHistory();
      testManladagCore.createChapterDownloader('one-piece', 900, pagesFolder).then((d) => {
        cd = d;
        stubDownloadImage = testMcSandbox.stub(cd as any, '_downloadImage');
        for (let i =0; i<17; i++) {
          stubDownloadImage.onCall(i).resolves();
        }
        stubDownloadImage.onCall(17).rejects();
        cd.start().finally(done);
      });
    });

    it('Chapter\'s download started', function() {
      expect(fakeChapterStart).calledOnce;
      const args:argsOnDonwloadChapterStartedListener = {chapter, manga, pageCount, path, source};
      expect(fakeChapterStart.firstCall).to.have.been.calledWithExactly(args);
    });

    it('Page\'s download started (18 times)', function() {
      expect(fakePageStart.firstCall).to.have.been.calledAfter(fakeChapterStart.lastCall);
      checkPageCall(fakePageStart, 18);
    });

    it('Page\'s download finished (17 times)', function() {
      expect(fakePageStart.lastCall).to.have.been.calledAfter(fakePageFinish.lastCall);
      checkPageCall(fakePageFinish, 17);
    });

    it('Page\'s download error', function() {
      expect(fakePageError).calledOnce;
      expect(fakePageError.firstCall).to.have.been.calledAfter(fakePageStart.lastCall);
      const args:Omit<argsOnDonwloadPageErrorListener, 'error'>= {chapter, manga, page: 18, pageCount, path: cd.getPageUrlPath(17), source};
      expect(fakePageError.firstCall.args[0]).to.include(args);
    });

    it('Chapter\'s download error', function() {
      expect(fakeChapterError).calledOnce;
      expect(fakeChapterError.firstCall).to.have.been.calledAfter(fakePageError.lastCall);
      const args:Omit<argsOnDonwloadChapterErrorListener, 'error'>= {chapter, manga, pageCount, path, source};
      expect(fakeChapterError.firstCall.args[0]).to.include(args);
    });

    it('18 image downloaded (or tried)', function() {
      expect(stubDownloadImage.callCount).eq(18);
    });

    it('Chapter\'s download finished (not called)', function() {
      expect(fakeChapterFinish).not.called;
    });

    it('Restart and aborted not called', function() {
      [fakePageRestart, fakeChapterAbort].forEach((spy)=> expect(spy).not.called);
    });
  });

  describe('Page\'s download restart', function() {
    before(function(done) {
      resetAllHistory();
      testMcSandbox.restore();
      testManladagCore.createChapterDownloader('one-piece', 900, pagesFolder).then((d) => {
        cd = d;
        stubDownloadImage = testMcSandbox.stub(cd as any, '_downloadImage');
        for (let i =0; i<9; i++) {
          if ((i+1)%3 != 0) stubDownloadImage.onCall(i).resolves();
          else stubDownloadImage.onCall(i).rejects();
        }
        cd.start({maxRetryCount: 2}).finally(done);
      });
    });

    it('Chapter\'s download started', function() {
      expect(fakeChapterStart).to.be.calledOnce;
    });

    it('Page\'s download started (9 times)', function() {
      expect(fakePageStart.callCount).to.be.eq(9);
    });

    it('Page\'s download finished (6 times)', function() {
      checkPageCall(fakePageFinish, 6);
    });

    it('Page\'s download restarted (2 times)', function() {
      expect(fakePageRestart).to.be.calledTwice;

      const args:Omit<argsOnDonwloadPageRestartedListener, 'error'> = {chapter, manga, maxRetryCount: cd.maxRetryCount, retryCount: 1, page: 3, path: cd.getPageUrlPath(2), pageCount, source};
      expect(fakePageRestart.firstCall.args[0]).to.include(args);

      const args2:Omit<argsOnDonwloadPageRestartedListener, 'error'> = {chapter, manga, maxRetryCount: cd.maxRetryCount, retryCount: 2, page: 5, path: cd.getPageUrlPath(4), pageCount, source};
      expect(fakePageRestart.secondCall.args[0]).to.include(args2);
    });


    it('Page\'s download error', function() {
      expect(fakePageError).calledOnce;
      expect(fakePageError.firstCall).to.have.been.calledAfter(fakePageStart.lastCall);
      const args:Omit<argsOnDonwloadPageErrorListener, 'error'>= {chapter, manga, page: 7, pageCount, path: cd.getPageUrlPath(6), source};
      expect(fakePageError.firstCall.args[0]).to.include(args);
    });

    it('Chapter\'s download error', function() {
      expect(fakeChapterError).calledOnce;
      expect(fakeChapterError.firstCall).to.have.been.calledAfter(fakePageError.lastCall);
      const args:Omit<argsOnDonwloadChapterErrorListener, 'error'>= {chapter, manga, pageCount, path, source};
      expect(fakeChapterError.firstCall.args[0]).to.include(args);
    });

    it('Chapter\'s download finished (not called)', function() {
      expect(fakeChapterFinish).not.called;
    });
  });

  describe('Download abort', function() {
    let server:Server;
    this.beforeAll(function(done) {
      imageTimeout(0);
      testMcSandbox.restore();
      rimraf.sync(pagesFolder);
      mkdirSync(pagesFolder);
      getServer(port).then((s) => {
        server = s;
        done();
      });
    });
    this.afterAll(function(done) {
      this.timeout(5000);
      rimraf.sync(pagesFolder);
      if (server) {
        return server.close(done);
      } else return done();
    });
    before(function(done) {
      resetAllHistory();
      testManladagCore.createChapterDownloader(key, chapter, pagesFolder).then((d) => {
        cd = d;
        done();
      });
    });
    it('Not Done if download not started', function(done) {
      expect(cd.abort()).to.eventually.equal(ChapterDownloaderFlags.ACTION.NOT_DONE).notify(done);
    });
    it('abort if started', function(done) {
      this.timeout(50000);
      cd.once('download-page-finished', function(a) {
        expect(cd.abort()).to.eventually.eq(ChapterDownloaderFlags.ACTION.DONE).notify(done);
        expect(cd.getState()).to.be.eq(ChapterDownloaderFlags.STATE.WAITING_TO_ABORT);
      });
      cd.start();
    });
  });

  describe('Download start', function() {
    let server:Server;
    this.beforeAll(function(done) {
      this.timeout(5000);
      mkdirSync(pagesFolder);
      imageTimeout(0);
      getServer(port).then((s) => {
        server = s;
        testManladagCore.createChapterDownloader(key, chapter, pagesFolder).then((d) => {
          cd = d;

          done();
        });
      });
    });
    this.afterAll(function(done) {
      this.timeout(5000);
      if (server) {
        return server.close(done);
      } else return done();
    });

    it('consecutive start with files deleting', function() {
      return Promise.all([
        expect(Promise.resolve(cd.getState())).to.eventually.eq(ChapterDownloaderFlags.STATE.WAITING_TO_START),
        expect(cd.start({clearFiles: {onFinish: true}})).to.eventually.eq(ChapterDownloaderFlags.ACTION.DONE).then(),
        expect(Promise.resolve(cd.getState())).to.eventually.eq(ChapterDownloaderFlags.STATE.STARTED),
        expect(cd.start()).to.eventually.eq(ChapterDownloaderFlags.ACTION.NOT_DONE).then(),
      ]);
    });

    it('State Finished', function() {
      expect(cd.getState()).to.be.eq(ChapterDownloaderFlags.STATE.FINISHED);
    });

    it('check if files was deleted after download finished', function() {
      for (let i = 0; i<pageCount; i++) {
        expect(cd.getPageUrlPath(i)).to.not.be.a.path();
      }
    });
    it('Download start without files deleteing', function(done) {
      cd.start({clearFiles: {onFinish: false}}).then((action)=> {
        expect(action).to.be.eq(ChapterDownloaderFlags.ACTION.DONE);
        for (let i = 0; i<pageCount; i++) {
          expect(cd.getPageUrlPath(i)).to.be.a.file();
        }
        done();
      });
    });
  });
  describe('Download flag', function() {
    let server:Server;
    before(function(done) {
      resetAllHistory();
      this.timeout(5000);
      if (existsSync(pagesFolder)) rimraf.sync(pagesFolder);
      mkdirSync(pagesFolder);
      imageTimeout(0);
      getServer(port).then((s) => {
        server = s;
        done();
      });
    });
    after(function(done) {
      this.timeout(5000);
      if (server) {
        return server.close(done);
      } else return done();
    });
    it('flag auto start', async function() {
      imageTimeout(0);
      this.timeout(4000);
      this.slow(1500);

      const val = await testManladagCore.createChapterDownloader('one-piece', 900, pagesFolder, ChapterDownloaderFlags.INIT.AUTO_START);
      expect(val.getState()).to.be.eq(ChapterDownloaderFlags.STATE.STARTED);
      await new Promise((resolve)=>setTimeout(resolve, 1000));
      expect(val.getState()).to.be.eq(ChapterDownloaderFlags.STATE.FINISHED);
    });
    it('flag clear events', async function() {
      imageTimeout(0);
      this.timeout(10000);
      this.slow(500);
      resetAllHistory();
      // expect(testManladagCore.createChapterDownloader('one-piece', 900, pagesFolder)).to.eventually.fulfilled.notify(done);

      const val = await testManladagCore.createChapterDownloader('one-piece', 900, pagesFolder, ChapterDownloaderFlags.INIT.CLEAR_EVENTS);

      expect(val.getState()).to.be.eq(ChapterDownloaderFlags.STATE.WAITING_TO_START);
      allFakes.forEach((f) => expect(f).to.be.not.called);
    });
  });
});

