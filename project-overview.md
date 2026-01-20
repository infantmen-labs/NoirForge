NoirForge
The fastest way to build Zero-Knowledge apps on Solana.

Problem Statement

Zero-Knowledge (ZK) proofs are powerful but painfully hard to build.

Even with Noir, developers still face:

Steep learning curves for writing circuits

Complex integration with Solana programs

Manual proof generation & verification

Poor tooling for debugging and testing

No standard templates for common privacy use cases

As a result, most Solana developers avoid ZK entirely, slowing down privacy adoption across payments, DeFi, and consumer apps.

Solution

NoirForge is a developer toolkit + SDK that makes building ZK-powered Solana apps fast, simple, and production-ready.

It provides:

Pre-built Noir circuit templates

One-command verifier deployment + client bindings

Rust + TypeScript SDKs

CLI for proof workflows

Example dApps

Debug & testing utilities

With NoirForge, developers can add privacy to their Solana apps in minutes, not weeks.

Core Features
1. Noir Circuit Templates

Ready-to-use ZK circuits for:

Private token transfers

Anonymous voting

Hidden balances

Private KYC proofs

Confidential payments

Selective disclosure

Developers just modify parameters instead of writing circuits from scratch.

2. Verifier Deployment + Client Bindings Generator

Automatically produces and wires up:

A deployable Solana verifier program artifact (via Sunspot)

Anchor-compatible interfaces

Proof verification instructions

TypeScript helpers for building the verification instruction payload

No more manual proof plumbing.

3. CLI Tooling

One command to:

noirforge init

noirforge build

noirforge prove

noirforge deploy

Handles:

Circuit compilation (Nargo)

Proving + verifier artifact generation (Sunspot)

Key management

Program deployment

4. Rust + TypeScript SDKs

Simple APIs to:

Generate proofs

Submit proofs on-chain

Verify ZK claims

Interact with private state

Example:

await zk.submitProof(proof, publicInputs)

5. Debugging & Testing Tools

Local proof simulation

Constraint failure visualization

Test harness for ZK flows

Gas / compute estimation

This is huge for developer experience.

6. Example dApps

Showcase apps:

Private payments

Anonymous DAO voting

ZK-based access control

Private credentials

Judges love demos.

Tech Stack
ZK Layer

Noir (Aztec) + Nargo

Sunspot (Noir proving pipeline + verifier artifact generation)

Groth16 (on-chain verification via Sunspot verifier program)

Solana

Rust

Anchor

Solana Program Library

Solana CLI

Tooling

Node.js

TypeScript

Rust CLI

WASM bindings

Frontend

React / Next.js

Wallet adapters

Proof visualizer UI

Infra

GitHub

CI/CD

QuickNode / Helius RPC

Docker

Architecture Overview
Developer
   |
   |  NoirForge CLI
   v
Noir Circuits → Nargo (compile) → Sunspot (prove + verifier.so) → Solana Verifier Program
                                                           |
                                                           v
                                                     On-chain Verification
                                                           |
                                                           v
                                                      App Logic

Target Tracks & Bounties
Hackathon Track

✅ Privacy Tooling (Primary)

✅ Open Track (Optional)

Sponsor Bounties

Aztec – ZK with Noir (Best overall / Most creative / Best non-financial use)

QuickNode – Public Benefit Prize (open-source privacy tooling)

Helius – Best Privacy Project (Optional: use Helius RPC + tooling in demo)

Why This Can Win

High originality

Strong sponsor alignment

Developer-first impact

Clear demo story

Scales beyond the hackathon

Judges love tooling

Hackathon MVP Roadmap

Week 1:

CLI that wraps Nargo + Sunspot end-to-end (build/prove/deploy)

Template 1: ZK-gated access control or anonymous voting

Devnet deployment of the verifier program

Week 2:

Template 2: a second, judge-friendly template (e.g., selective disclosure)

TypeScript SDK + instruction payload helpers

Minimal demo dApp + 3-minute demo video

Docs: how to run locally + how to deploy + how to verify on devnet

Post-hack (Optional): expand templates, add a VS Code plugin, and build a circuit marketplace.

Optional Enhancements (Bonus Points)

VS Code plugin

Circuit marketplace

Gas optimization analyzer

Proof size visualizer

ZK learning playground

One-Sentence Pitch

NoirForge makes Zero-Knowledge on Solana as easy as deploying a smart contract.