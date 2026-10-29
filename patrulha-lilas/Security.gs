/**
 * Controle de acesso.
 * O e-mail de quem usa o sistema é confirmado pelo Google (token) no Registro.
 * O dono (conta que publicou) sempre tem acesso; os demais precisam estar
 * liberados no painel do Administrador (lista de e-mails ou domínio).
 */
var USUARIO_API_ = '';

function getCurrentUserEmail_() {
  return String(USUARIO_API_ || Session.getActiveUser().getEmail() || '').trim().toLowerCase();
}

function ehDono_(email) {
  const dono = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  return !!email && email === dono;
}

function assertAuthorized_() {
  const email = getCurrentUserEmail_();
  if (!email) throw new Error('Não foi possível identificar sua conta Google. Entre com uma conta Google e tente de novo.');
  if (ehDono_(email)) return true;
  const properties = PropertiesService.getScriptProperties();
  const allowedEmails = String(properties.getProperty('ALLOWED_EMAILS') || '')
    .split(/[\s,;]+/).map(function(value) { return value.trim().toLowerCase(); }).filter(String);
  const allowedDomain = String(properties.getProperty('ALLOWED_DOMAIN') || '').replace(/^@/, '').trim().toLowerCase();
  if (allowedEmails.indexOf(email) >= 0) return true;
  if (allowedDomain && email.endsWith('@' + allowedDomain)) return true;
  throw new Error('ACESSO_NEGADO: a conta ' + email + ' ainda não foi liberada. Peça ao administrador para autorizar seu e-mail.');
}

function lerAcesso_() {
  const properties = PropertiesService.getScriptProperties();
  return {
    emails: String(properties.getProperty('ALLOWED_EMAILS') || ''),
    dominio: String(properties.getProperty('ALLOWED_DOMAIN') || '')
  };
}

function gravarAcesso_(emails, dominio) {
  const lista = String(emails || '').split(/[\s,;]+/).map(function(v) { return v.trim().toLowerCase(); })
    .filter(function(v) { return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(v); });
  const dom = String(dominio || '').replace(/^@/, '').trim().toLowerCase();
  if (dom && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(dom)) throw new Error('Domínio inválido.');
  PropertiesService.getScriptProperties().setProperties({ ALLOWED_EMAILS: lista.join(','), ALLOWED_DOMAIN: dom });
  return lerAcesso_();
}
