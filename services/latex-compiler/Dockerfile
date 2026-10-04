FROM oven/bun:1.2.15 AS build
WORKDIR /build
COPY services/latex-compiler ./services/latex-compiler
RUN bun build services/latex-compiler/index.ts --target=node --format=esm --outfile=server.mjs

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    latexmk texlive-latex-base texlive-latex-recommended texlive-latex-extra \
    texlive-fonts-recommended texlive-fonts-extra texlive-plain-generic tex-gyre poppler-utils \
    && rm -rf /var/lib/apt/lists/* \
    && kpsewhich newtxtext.sty && kpsewhich extarticle.cls && kpsewhich binhex.tex
WORKDIR /app
COPY services/latex-compiler/smoke.tex /tmp/smoke.tex
RUN cd /tmp && pdflatex -no-shell-escape -interaction=nonstopmode -halt-on-error smoke.tex \
    && pdfinfo smoke.pdf && rm -f smoke.*
COPY --from=build /build/server.mjs ./server.mjs
USER node
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:8080/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.mjs"]
