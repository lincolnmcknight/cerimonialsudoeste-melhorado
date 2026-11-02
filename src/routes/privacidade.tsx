import { createFileRoute } from "@tanstack/react-router";
import { Cabecalho, WHATSAPP_CERIMONIAL } from "@/components/marca";

export const Route = createFileRoute("/privacidade")({
  head: () => ({ meta: [{ title: "Política de privacidade — Cerimonial Sudoeste" }] }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <div className="min-h-dvh bg-background pb-24">
      <Cabecalho voltar={{ to: "/", label: "Programação" }}>
        <h1 className="font-display text-5xl leading-none">Política de privacidade</h1>
        <p className="text-white/70 mt-3">Atualizada em 2 de novembro de 2026.</p>
      </Cabecalho>

      <main className="max-w-2xl mx-auto px-5 mt-8 space-y-6 text-[15px] leading-relaxed text-foreground/90">
        <section className="space-y-2">
          <h2 className="font-display text-2xl">O que é este app</h2>
          <p>
            O Cerimonial Sudoeste publica a programação dos cultos da igreja: a ordem de cada culto, horários e
            responsáveis. Qualquer pessoa pode ver as programações publicadas sem criar conta.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl">Quais dados guardamos</h2>
          <p>Quando você cria uma conta, por e-mail ou com o Google, guardamos apenas:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>seu nome e seu endereço de e-mail;</li>
            <li>o papel que a equipe deu a você no app, se houver (por exemplo, cerimonialista ou editor);</li>
            <li>os avisos de programação que você recebeu e se quer continuar recebendo.</li>
          </ul>
          <p>
            Ao entrar com o Google, recebemos somente seu nome, e-mail e foto de perfil. Não acessamos seus
            contatos, arquivos, e-mails nem qualquer outro dado da sua conta Google.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl">Para que usamos</h2>
          <p>
            Usamos esses dados só para identificar você no app, liberar as funções da equipe do cerimonial e enviar
            avisos quando uma programação é publicada ou alterada. Não vendemos, não compartilhamos e não usamos seus
            dados para publicidade.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl">Onde ficam</h2>
          <p>
            Os dados ficam armazenados no Supabase, serviço de banco de dados usado pelo app, em servidores no Brasil
            (região de São Paulo).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl">Como apagar sua conta</h2>
          <p>
            Você pode desligar os avisos a qualquer momento na tela Avisos. Para apagar sua conta e todos os seus
            dados, fale com a cerimonialista {WHATSAPP_CERIMONIAL.nome} pelo WhatsApp {WHATSAPP_CERIMONIAL.telefone}.
          </p>
        </section>
      </main>
    </div>
  );
}
