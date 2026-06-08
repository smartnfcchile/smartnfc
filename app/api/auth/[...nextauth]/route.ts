// app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/auth"; 

// Creamos el "manejador" (handler) que procesará las peticiones GET y POST
const handler = NextAuth(authOptions);

// Next.js App Router requiere que exportemos los métodos HTTP por separado
export { handler as GET, handler as POST }