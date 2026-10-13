# Resume source

`Tejass-Kaushik-Resume.tex` is the editable source for the downloadable PDF. It adapts [Jake Gutierrez's resume](https://github.com/jakegut/resume), also published as [Jake's Resume on Overleaf](https://www.overleaf.com/latex/templates/jakes-resume/syzfjbzwjncs). Upstream revision: `3e64a933141a7cda3a328f0743f73a201628a4ba`. The original MIT notice is retained in the source and `LICENSE-JAKE`.

The layout uses a single main column, serif type, ruled section headings and aligned dates. Conditional font handling allows pdfLaTeX on Overleaf and XeTeX/Tectonic locally. Unicode extraction must be checked in the exported PDF; the template alone does not establish ATS compatibility.

## Build

Install Tectonic and Poppler (`pdfinfo`), then run:

```sh
node scripts/build-resume.mjs
```

`TECTONIC_BIN` and `PDFINFO_BIN` may point to existing executables. The compiler may download its TeX packages on first use. The script compiles to a temporary directory, verifies one Letter-size page without encryption, and then replaces `client/public/Tejass-Kaushik-Resume.pdf`. It leaves the previous PDF intact if compilation or validation fails.

Normal website builds do not require TeX. They copy the existing PDF into `docs/`. Keep the accessible HTML companion at `client/public/resume.html` synchronized when editing facts or bullets. It provides a reading alternative because this traditional LaTeX export is not a tagged PDF.

Preserve personal/team/AI attribution, prototype/release limits and supported dates. Neither model-panel opinions nor local PDF parsing checks are results from a commercial ATS. Review the final page and its extracted text before publishing.
