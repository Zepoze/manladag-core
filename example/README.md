# Create your own Core's Library
## Agreement
### Export
In order to be able to use your library properly with **@manladag/core** you have to implement your code logic as a **Manladag Lib core interface** and export it in the following way:

```typescript

const yourLib = {...}

// javascript
module.exports.Lib = yourLib;

// typescript
export const Lib = yourLib;

```
### Lib Mangas
Your Lib's mangas should be an object of **Manladag.manga** extension and by agreement its keys  need to be the manga's title in lowercase and white-space replaced with '-'
### Log will be your ennemy
Your library will probably be used in another project so don't polish it with `console.log`.
### Typescript
[Typescript](https://www.typescriptlang.org/) is highly recomended for types checking.
## Example of a functional implementation
### Init
```bash
$ mkdir yourPlugin
$ cd yourPlugin
$ npm init

# the code logic you will use ( web scrapping, json request, etc ...)
# npm install jsdom
# npm install axios
# npm install `anyPackageYouWant`
```
We will use the web scrapper [jsdom](https://www.npmjs.com/package/jsdom) in this example
```bash
$ npm install jsdom
```

#### Typescript +

```bash
$ npm install --save-dev typescript @types/jsdom @types/adm-zip @manladag/core
$ touch tsconfig.json
```

##### Example tsconfig.json
```json
{
  "compilerOptions": {
    "target": "es5",
    "module": "commonjs",
    "lib": ["ES2015","DOM"],
    "declaration": true,
    "outDir": "./dist",    
}
```
> Don't forget to change the main entry in the `package.json` to `'./dist/index.js'`

>Add `"build": "tsc"` to scripts entry in `package.json`

## Your Library
see an example to myLib.ts
