/**
 * Lido a cada chamada: os imports rodam antes do .env ser carregado,
 * então guardar isso em constante de módulo daria vazio.
 */
function chave(): string {
  return process.env.RESEND_API_KEY ?? "";
}

function remetente(): string {
  return process.env.RESEND_FROM ?? "Mudai <contato@mudai.codermaster.com.br>";
}

export function emailConfigurado(): boolean {
  return chave().length > 0;
}

export function emailDoCodigo(nome: string, codigo: string): { assunto: string; html: string; texto: string } {
  const primeiroNome = (nome || "").split(" ")[0] || "oi";
  const assunto = `${codigo} é seu código no Mudaí`;

  const texto = `Oi, ${primeiroNome}.

Seu código para entrar no Mudaí é: ${codigo}

Ele vale por 15 minutos. Se não foi você que pediu, é só ignorar este e-mail.

Mudaí — mudai.codermaster.com.br`;

  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#f7f4ec;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ec;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#fffdf8;border-radius:20px;overflow:hidden">
        <tr><td style="background:#1b4332;padding:24px 28px">
          <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px">Mudaí</span>
        </td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 6px;font-size:15px;color:#1a2e22">Oi, ${primeiroNome}.</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#6b7f72">
            Esse é seu código para entrar no Mudaí. Ele vale por 15 minutos.
          </p>
          <div style="background:#edf7ef;border-radius:14px;padding:18px;text-align:center">
            <span style="font-size:32px;font-weight:800;letter-spacing:6px;color:#1b4332">${codigo}</span>
          </div>
          <p style="margin:20px 0 0;font-size:12.5px;line-height:1.5;color:#6b7f72">
            Se não foi você que pediu, pode ignorar este e-mail.
          </p>
        </td></tr>
        <tr><td style="padding:16px 28px 24px;border-top:1px solid #e3e8e0">
          <span style="font-size:12px;color:#6b7f72">mudai.codermaster.com.br</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { assunto, html, texto };
}

export async function enviarCodigo(
  para: string,
  nome: string,
  codigo: string
): Promise<{ ok: boolean; erro?: string }> {
  if (!emailConfigurado()) return { ok: false, erro: "EMAIL_NAO_CONFIGURADO" };
  const { assunto, html, texto } = emailDoCodigo(nome, codigo);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${chave()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: remetente(), to: [para], subject: assunto, html, text: texto }),
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) return { ok: true };
    const corpo = await res.text().catch(() => "");
    return { ok: false, erro: `${res.status} ${corpo.slice(0, 180)}` };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}
