package br.pucminas.puclim.support;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public final class ConcurrentTestActions {
    private ConcurrentTestActions() {
    }

    public static <T> List<T> together(Callable<T> first, Callable<T> second) throws Exception {
        var executor = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);
        try {
            var one = executor.submit(() -> {
                start.await();
                return first.call();
            });
            var two = executor.submit(() -> {
                start.await();
                return second.call();
            });
            start.countDown();
            return List.of(one.get(30, TimeUnit.SECONDS), two.get(30, TimeUnit.SECONDS));
        } finally {
            executor.shutdownNow();
        }
    }
}
