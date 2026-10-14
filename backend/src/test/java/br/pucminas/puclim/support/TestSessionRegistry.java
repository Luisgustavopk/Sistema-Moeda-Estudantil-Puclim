package br.pucminas.puclim.support;

import java.util.concurrent.ConcurrentHashMap;

import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionIdListener;
import jakarta.servlet.http.HttpSessionListener;

/**
 * Permite configurar o timeout da sessão específica do cenário, sem flags
 * globais.
 */
public final class TestSessionRegistry implements HttpSessionListener, HttpSessionIdListener {
    private final ConcurrentHashMap<String, HttpSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void sessionCreated(HttpSessionEvent event) {
        sessions.put(event.getSession().getId(), event.getSession());
    }

    @Override
    public void sessionDestroyed(HttpSessionEvent event) {
        sessions.remove(event.getSession().getId());
    }

    @Override
    public void sessionIdChanged(HttpSessionEvent event, String oldId) {
        sessions.remove(oldId);
        sessions.put(event.getSession().getId(), event.getSession());
    }

    public void expireAfter(String id, int seconds) {
        sessions.get(id).setMaxInactiveInterval(seconds);
    }
}
