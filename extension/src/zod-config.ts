import { z } from "zod";

// Zod probes `new Function` when it builds its first object schema, which the
// extension's content security policy reports as a violation. The panel imports
// this module first, before any schema exists.
z.config({ jitless: true });
