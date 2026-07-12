package ru.messenger.chaosmessenger.attachment;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import ru.messenger.chaosmessenger.attachment.domain.EncryptedAttachment;
import ru.messenger.chaosmessenger.attachment.repository.EncryptedAttachmentRepository;
import ru.messenger.chaosmessenger.attachment.service.AttachmentStorageService;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AttachmentStorageServiceTest {

    @TempDir
    Path tempDir;

    @Test
    void storesAndReadsCiphertextUnderGeneratedUuid() throws Exception {
        EncryptedAttachmentRepository repository = mock(EncryptedAttachmentRepository.class);
        when(repository.save(any(EncryptedAttachment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        AttachmentStorageService service = service(repository, 1024);

        byte[] ciphertext = new byte[] {1, 2, 3, 4};
        String id = service.upload(1L, 10L, ciphertext, "application/octet-stream");

        assertThat(id).matches("^[0-9a-f-]{36}$");
        assertThat(Files.readAllBytes(tempDir.resolve(id))).containsExactly(ciphertext);

        EncryptedAttachment metadata = new EncryptedAttachment();
        metadata.setAttachmentId(id);
        when(repository.findByAttachmentId(id)).thenReturn(Optional.of(metadata));
        assertThat(service.download(id)).containsExactly(ciphertext);
        verify(repository).save(any(EncryptedAttachment.class));
    }

    @Test
    void rejectsEmptyOversizedAndTraversalIdentifiers() throws Exception {
        EncryptedAttachmentRepository repository = mock(EncryptedAttachmentRepository.class);
        AttachmentStorageService service = service(repository, 3);

        assertThatThrownBy(() -> service.upload(1L, null, new byte[0], null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("empty");
        assertThatThrownBy(() -> service.upload(1L, null, new byte[4], null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("limit");
        assertThatThrownBy(() -> service.download("../../etc/passwd"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid attachment id");
    }

    @Test
    void removesPayloadWhenMetadataSaveFails() throws Exception {
        EncryptedAttachmentRepository repository = mock(EncryptedAttachmentRepository.class);
        when(repository.save(any(EncryptedAttachment.class))).thenThrow(new IllegalStateException("db unavailable"));
        AttachmentStorageService service = service(repository, 1024);

        assertThatThrownBy(() -> service.upload(1L, null, new byte[] {1}, null))
                .isInstanceOf(IllegalStateException.class);
        try (var files = Files.list(tempDir)) {
            assertThat(files.toList()).isEmpty();
        }
    }

    private AttachmentStorageService service(EncryptedAttachmentRepository repository, long maxBytes) throws Exception {
        AttachmentStorageService service = new AttachmentStorageService(repository);
        ReflectionTestUtils.setField(service, "storagePath", tempDir.toString());
        ReflectionTestUtils.setField(service, "maxBytes", maxBytes);
        ReflectionTestUtils.invokeMethod(service, "init");
        return service;
    }
}
