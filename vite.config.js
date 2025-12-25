import {
  defineConfig
} from 'vite';
import path from 'path';
import Scan from "./Package/plugin";

export default defineConfig( {
  resolve:{
    alias:{
      "pria":path.resolve(__dirname,"Package")
    }
  },
  plugins: [Scan()],
})
