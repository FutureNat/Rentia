import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  // Vinext no acepta el matcher avanzado que genera Clerk por defecto.
  // El middleware queda disponible en todas las rutas de la aplicación y
  // cada endpoint decide explícitamente si exige autenticación.
  matcher: ["/(.*)"],
};
