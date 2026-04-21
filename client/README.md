# Comfort Travel CZ — Frontend

React 19 + TypeScript + Vite frontend pro aplikaci Comfort Travel CZ.

## Spuštění v režimu vývoje

```bash
npm install
npm run dev
```

Aplikace poběží na [http://localhost:5173](http://localhost:5173). Backend musí být dostupný na portu 3001.

## Sestavení produkční verze

```bash
npm run build
```

Výstup bude v adresáři `dist/`. Dockerfile sestaví nginx obraz, který soubory servíruje.
