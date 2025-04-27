import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [
    tailwindcss, // Use the imported variable
    autoprefixer, // Use the imported variable
  ],
}
