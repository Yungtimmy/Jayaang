"use client";

import { motion } from "framer-motion";

const partners = ["Injective", "Helix", "Mito", "Kado", "Ninja Blaze"];

export function TrustedBy() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-muted">Built for the Injective ecosystem</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {partners.map((name, i) => (
            <motion.span
              key={name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.5 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="text-sm font-medium tracking-wide text-muted/60 hover:text-muted transition-colors"
            >
              {name}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}