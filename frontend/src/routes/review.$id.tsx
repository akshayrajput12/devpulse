import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/review/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/reviews/$id", params: { id: params.id } });
  },
});
