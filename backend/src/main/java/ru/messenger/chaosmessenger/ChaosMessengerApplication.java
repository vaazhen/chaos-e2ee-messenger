package ru.messenger.chaosmessenger;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ChaosMessengerApplication {

    public static void main(String[] args) {
        SpringApplication.run(ChaosMessengerApplication.class, args);
    }

}
