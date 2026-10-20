package br.pucminas.puclim.repository;

import java.util.*;
import jakarta.persistence.*;
import org.springframework.stereotype.Repository;
import br.pucminas.puclim.exception.ApiException;

/** Typed queries kept in the persistence layer; services own authorization and transactions. */
@Repository
public class GamificationRepository {
    @PersistenceContext private EntityManager em;
    public <T> T save(T entity) { em.persist(entity); return entity; }
    public <T> T get(Class<T> type, String id) {
        T value = em.find(type, id);
        if (value == null) throw ApiException.missing();
        return value;
    }
    public <T> T optional(Class<T> type, String id) { return em.find(type, id); }
    public <T> T lock(Class<T> type, String id) {
        T value = get(type, id);
        em.refresh(value, LockModeType.PESSIMISTIC_WRITE);
        return value;
    }
    public <T> List<T> list(Class<T> type, String jpql, Object... args) {
        TypedQuery<T> q = em.createQuery(jpql, type);
        for (int i=0; i<args.length; i+=2) q.setParameter(args[i].toString(), args[i+1]);
        return q.getResultList();
    }
    public <T> Optional<T> first(Class<T> type, String jpql, Object... args) {
        return list(type, jpql, args).stream().findFirst();
    }
}
