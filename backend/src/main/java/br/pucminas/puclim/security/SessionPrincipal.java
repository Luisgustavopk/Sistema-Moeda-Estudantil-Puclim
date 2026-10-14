package br.pucminas.puclim.security;

import java.io.Serializable;

public record SessionPrincipal(String id, long credentialVersion) implements Serializable {
}
