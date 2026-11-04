package br.pucminas.puclim.mail;

/** Content rendered before enqueueing, so retries preserve the original message. */
public record EmailContent(String subject, String body) {
}
