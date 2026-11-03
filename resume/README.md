# Resume source

Edit `content.mjs` for public resume content. The generator uses that one source for the accessible HTML page and the downloadable one-page PDF. `template.tex` and `style.css` control their respective layouts; `Tejass-Kaushik-Resume.tex` is generated and can be uploaded directly to Overleaf.

The LaTeX layout adapts [Jake Gutierrez's resume](https://github.com/jakegut/resume), also published as [Jake's Resume on Overleaf](https://www.overleaf.com/latex/templates/jakes-resume/syzfjbzwjncs), revision `3e64a933141a7cda3a328f0743f73a201628a4ba`. Preserve the MIT notice in `template.tex`, the generated source and `LICENSE-JAKE`.

## Build and check

Install Tectonic and Poppler (`pdfinfo`, `pdftotext`), then run:

```sh
node scripts/build-resume.mjs
node --test tests/portfolio-resume.mjs
```

`TECTONIC_BIN`, `PDFINFO_BIN` and `PDFTOTEXT_BIN` can point to existing executables. The script compiles to a temporary directory, checks one Letter-size page without encryption, and verifies every content item in the extracted PDF text before replacing the public HTML and PDF. A failed compile or validation preserves both previous public files. The first compile may download TeX packages.

Normal website builds use the checked-in HTML and PDF and do not require TeX. Run the generator whenever content or layout changes. The test checks that both generated text sources are current. Review the rendered PDF and check its links before publishing. This traditional LaTeX PDF is not tagged; the HTML page remains the accessible reading alternative. These checks are not a commercial ATS score.

The Anticipation Labs dates describe company tenure; its role line explicitly distinguishes the current COO role from prior engineering work. No promotion date is inferred. Organization and campaign figures remain attributed to those organizations or campaigns. Unverified MoleculeAI and PromMatch counts, solo-ownership claims, graduation dates, city, and campaign record deltas are omitted.
