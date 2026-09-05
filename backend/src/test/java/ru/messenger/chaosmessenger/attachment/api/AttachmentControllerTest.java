package ru.messenger.chaosmessenger.attachment.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;
import ru.messenger.chaosmessenger.attachment.access.AttachmentAccessService;
import ru.messenger.chaosmessenger.attachment.domain.EncryptedAttachment;
import ru.messenger.chaosmessenger.attachment.service.AttachmentStorageService;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.service.UserIdentityService;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttachmentControllerTest {

    @Mock AttachmentStorageService attachmentStorageService;
    @Mock UserIdentityService userIdentityService;
    @Mock AttachmentAccessService attachmentAccessService;
    @Mock ru.messenger.chaosmessenger.auth.service.CredentialRateLimiter credentialRateLimiter;
    @Mock Authentication authentication;

    @InjectMocks AttachmentController controller;

    @Test
    void uploadRejectsEmptyCiphertext() throws Exception {
        MockMultipartFile empty = new MockMultipartFile("file", "empty.bin", "application/octet-stream", new byte[0]);

        assertThatThrownBy(() -> controller.upload(empty, 10L, authentication))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
        verify(attachmentStorageService, never()).upload(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void uploadRejectsCallerWhoIsNotInTheChat() throws Exception {
        when(authentication.getName()).thenReturn("alice");
        when(userIdentityService.require("alice")).thenReturn(user(1L));
        when(attachmentAccessService.canUpload(10L, 1L)).thenReturn(false);
        MockMultipartFile file = new MockMultipartFile("file", "c.bin", "application/octet-stream", new byte[] {1, 2});

        assertThatThrownBy(() -> controller.upload(file, 10L, authentication))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
        verify(attachmentStorageService, never()).upload(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void uploadStoresCiphertextForChatMember() throws Exception {
        when(authentication.getName()).thenReturn("alice");
        when(userIdentityService.require("alice")).thenReturn(user(1L));
        when(attachmentAccessService.canUpload(10L, 1L)).thenReturn(true);
        when(attachmentStorageService.upload(1L, 10L, new byte[] {1, 2}, "application/octet-stream"))
                .thenReturn("11111111-1111-4111-8111-111111111111");
        MockMultipartFile file = new MockMultipartFile("file", "c.bin", "application/octet-stream", new byte[] {1, 2});

        Map<String, String> response = controller.upload(file, 10L, authentication);

        assertThat(response).containsEntry("attachmentId", "11111111-1111-4111-8111-111111111111");
    }

    @Test
    void downloadRejectsCallerWithoutAccess() throws Exception {
        EncryptedAttachment attachment = attachment("att-1", 1L, 10L);
        when(authentication.getName()).thenReturn("bob");
        when(userIdentityService.require("bob")).thenReturn(user(2L));
        when(attachmentStorageService.findByAttachmentId("att-1")).thenReturn(attachment);
        when(attachmentAccessService.canDownload(attachment, 2L)).thenReturn(false);

        assertThatThrownBy(() -> controller.download("att-1", authentication))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
        verify(attachmentStorageService, never()).download("att-1");
    }

    @Test
    void downloadReturnsCiphertextWithNosniffAndNoStore() throws Exception {
        EncryptedAttachment attachment = attachment("att-1", 1L, 10L);
        when(authentication.getName()).thenReturn("alice");
        when(userIdentityService.require("alice")).thenReturn(user(1L));
        when(attachmentStorageService.findByAttachmentId("att-1")).thenReturn(attachment);
        when(attachmentAccessService.canDownload(attachment, 1L)).thenReturn(true);
        when(attachmentStorageService.download("att-1")).thenReturn(new byte[] {9, 8, 7});

        ResponseEntity<byte[]> response = controller.download("att-1", authentication);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsExactly(9, 8, 7);
        assertThat(response.getHeaders().getCacheControl()).contains("no-store");
        assertThat(response.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(response.getHeaders().getFirst("Content-Disposition"))
                .contains("encrypted-att-1.bin");
    }

    private static User user(Long id) {
        User user = new User();
        user.setId(id);
        return user;
    }

    private static EncryptedAttachment attachment(String attachmentId, Long uploaderId, Long chatId) {
        EncryptedAttachment attachment = new EncryptedAttachment();
        attachment.setAttachmentId(attachmentId);
        attachment.setUploaderId(uploaderId);
        attachment.setChatId(chatId);
        return attachment;
    }
}
