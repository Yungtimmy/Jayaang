import Link from "next/link";
import { Code2, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-surface/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <span className="text-xs font-bold text-background">J</span>
              </div>
              <span className="font-semibold">Jayaang</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted">
              Secure Merkle airdrops on Injective. Create campaigns, distribute native INJ, and let
              recipients claim with cryptographic proofs.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>
                <Link href="/dashboard" className="hover:text-white">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/create" className="hover:text-white">
                  Create Campaign
                </Link>
              </li>
              <li>
                <Link href="/claim" className="hover:text-white">
                  Claim Tokens
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Resources</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>
                <a
                  href="https://testnet.faucet.injective.network/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  INJ Faucet
                </a>
              </li>
              <li>
                <a
                  href="https://testnet.mintscan.io/injective"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  Explorer
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Yungtimmy/Jayaang"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-xs text-muted">© 2026 Jayaang. Built on Injective.</p>
          <div className="flex gap-4">
            <a href="https://github.com/Yungtimmy/Jayaang" className="text-muted hover:text-white">
              <Code2 className="h-4 w-4" />
            </a>
            <a href="https://twitter.com/Injective_" className="text-muted hover:text-white">
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}