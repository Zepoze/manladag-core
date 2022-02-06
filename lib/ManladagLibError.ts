import {WebsiteMeta} from './manladag-namespace';

export class ManladagLibError extends Error implements WebsiteMeta {
  name:string = 'ManladagLibError'
  website:string
  url:string
  stack?:string

  constructor(source:WebsiteMeta, error:Error) {
    super(`Error in the lib ${source.website} :\n ${error.message ?? error}\nIf the error persist please contact his author`);
    this.website = source.website;
    this.url = source.url;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ManladagLibError);
    }
  }
}
