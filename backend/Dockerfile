FROM maven:3.9.14-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml ./
COPY src ./src
RUN mvn -B --no-transfer-progress verify

FROM eclipse-temurin:17-jre
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/* && \
    addgroup --system --gid 1001 chaos && \
    adduser --system --uid 1001 --ingroup chaos chaos && \
    mkdir -p /app /app/attachments /tmp && \
    chown -R chaos:chaos /app /tmp
WORKDIR /app
COPY --from=build --chown=chaos:chaos /build/target/app.jar /app/app.jar
USER chaos
EXPOSE 8080 9091
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -Djava.io.tmpdir=/tmp"
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -fsS http://127.0.0.1:9091/actuator/health/readiness || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
