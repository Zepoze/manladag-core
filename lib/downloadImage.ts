import axios from 'axios';
import fs from 'fs';
import {IncomingMessage} from 'http';


export function downloadImage(url:string, downloadImageController:DownloadImageController) {
  return new Promise<void>((resolve, reject) => {
    downloadImageController.setPromiseSuite(resolve, reject);
    axios({
      method: 'get',
      url,
      responseType: 'stream',
      signal: downloadImageController.signal,
    })
        .then(function(res) {
          downloadImageController.setResponse(res.data);


          // timeout on response if the page could be undownlable
          // ['close', 'end', 'error'].forEach((val) => res.data.on(val, console.log.bind(null, val)));
        }).
        catch((e:any) => {
          downloadImageController.closeError(e);
        })
    ;
  });
}

export class DownloadImageController extends AbortController {
  readonly file:fs.WriteStream;
  private response?:IncomingMessage;
  private _resolver?:(value: void | PromiseLike<void>) => void;
  private _rejecter?:(reason?: any) => void


  constructor(path:string) {
    super();
    this.file = fs.createWriteStream(path);
  }

  get isResponsed() {
    return !!this.response;
  }

  public setResponse(val:IncomingMessage) {
    if (!this.response) {
      this.response = val;

      this.response.socket.setTimeout(10000, this.closeError.bind(this, new Error('timeout')));
      this.response.pipe(this.file);
    }
  }

  public setPromiseSuite(resolve:(value: void | PromiseLike<void>) => void, reject:(reason?: any) => void) {
    if (!this._resolver && !this._rejecter) {
      this._resolver = resolve;
      this._rejecter = reject;

      this.file.once('close', this._resolver);
    }
  }

  public closeError(err:any) {
    this.file.removeListener('close', this._resolver!);
    // this.response?.unpipe(this.file);
    // Handle errors
    fs.unlinkSync(this.file.path.toString());

    if (this.isResponsed) {
      this.file.once('close', () => {
        this._rejecter!( err);
      });
      this.file.close();
    } else this._rejecter!(err);
  }
  public abort(error?:any) {
    if (this.isResponsed) this.closeError(error);
    else super.abort();
  }
}

