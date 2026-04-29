FROM oven/bun:1.3.12-alpine@sha256:26d8996560ca94eab9ce48afc0c7443825553c9a851f40ae574d47d20906826d AS yrda-beygir

ARG KRISTINARSNID_SLOD=/gögn/KRISTINsnid.csv
ENV FOST_GILDI_PROF=1
ENV KRISTINARSNID_SLOD=${KRISTINARSNID_SLOD}

WORKDIR /app
COPY package.json bun.lock tsconfig.json ./
COPY skriftur/afþjappa-pakkaðan-kjarna.mjs ./skriftur/
RUN bun install --frozen-lockfile
COPY . .
