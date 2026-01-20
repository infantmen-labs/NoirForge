FROM ubuntu:22.04

ARG DEBIAN_FRONTEND=noninteractive

ARG NODE_VERSION=20.18.1
ARG PNPM_VERSION=10.18.3
ARG RUST_TOOLCHAIN=1.90.0
ARG GO_VERSION=1.24.12
ARG SOLANA_VERSION=2.3.13
ARG NARGO_VERSION=1.0.0-beta.13
ARG SUNSPOT_COMMIT=8e61988da7b35add0e1384962f46c46b367235c1

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  git \
  build-essential \
  pkg-config \
  libssl-dev \
  clang \
  cmake \
  python3 \
  jq \
  unzip \
  xz-utils \
  && rm -rf /var/lib/apt/lists/*

# Node
RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
  | tar -xJ -C /usr/local --strip-components=1

RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate

# Go
RUN curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" \
  | tar -C /usr/local -xzf -

# Rust
RUN curl -fsSL https://sh.rustup.rs | sh -s -- -y --default-toolchain "${RUST_TOOLCHAIN}"

ENV PATH="/usr/local/go/bin:/root/.cargo/bin:/root/.nargo/bin:${PATH}"

# Solana CLI
RUN sh -c "$(curl -sSfL https://release.solana.com/v${SOLANA_VERSION}/install)"
ENV PATH="/root/.local/share/solana/install/active_release/bin:${PATH}"

# noirup + nargo
RUN curl -fsSL https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
RUN /root/.nargo/bin/noirup -v "${NARGO_VERSION}"

# Sunspot (pinned)
RUN git clone https://github.com/reilabs/sunspot.git /opt/sunspot \
  && cd /opt/sunspot \
  && git checkout "${SUNSPOT_COMMIT}" \
  && cd /opt/sunspot/go \
  && go build -o sunspot . \
  && ln -s /opt/sunspot/go/sunspot /usr/local/bin/sunspot

ENV GNARK_VERIFIER_BIN="/opt/sunspot/gnark-solana/crates/verifier-bin"

WORKDIR /workspace

CMD ["bash"]
