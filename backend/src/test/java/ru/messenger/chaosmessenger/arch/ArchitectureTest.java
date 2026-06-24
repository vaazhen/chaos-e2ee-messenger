package ru.messenger.chaosmessenger.arch;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Controller;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RestController;

class ArchitectureTest {

    @Test
    void controllersShouldNotDependOnRepositories() {
        ArchRule rule = ArchRuleDefinition.noClasses()
                .that().areAnnotatedWith(RestController.class)
                .or().areAnnotatedWith(Controller.class)
                .should().dependOnClassesThat()
                .areAssignableTo(JpaRepository.class);

        rule.check(new ClassFileImporter()
                .importPackages("ru.messenger.chaosmessenger"));
    }

    @Test
    void servicesShouldNotDependOnControllers() {
        ArchRule rule = ArchRuleDefinition.noClasses()
                .that().areAnnotatedWith(Service.class)
                .should().dependOnClassesThat()
                .areAnnotatedWith(RestController.class)
                .orShould().dependOnClassesThat()
                .areAnnotatedWith(Controller.class);

        rule.check(new ClassFileImporter()
                .importPackages("ru.messenger.chaosmessenger"));
    }

    @Test
    void restControllersShouldHaveRequestMapping() {
        ArchRule rule = ArchRuleDefinition.classes()
                .that().areAnnotatedWith(RestController.class)
                .should().beAnnotatedWith(org.springframework.web.bind.annotation.RequestMapping.class);

        rule.check(new ClassFileImporter()
                .importPackages("ru.messenger.chaosmessenger"));
    }
}
