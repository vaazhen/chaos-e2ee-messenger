package ru.messenger.chaosmessenger.attachment.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import ru.messenger.chaosmessenger.attachment.access.AttachmentAccessService;
import ru.messenger.chaosmessenger.attachment.domain.EncryptedAttachment;
import ru.messenger.chaosmessenger.attachment.service.AttachmentStorageService;
import ru.messenger.chaosmessenger.user.domain.User;
import ru.messenger.chaosmessenger.user.service.UserIdentityService;

import java.io.IOException;
import java.util.Map;

@Tag(name = "Attachments", description = "Encrypted file upload and download")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/attachments")
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentStorageService attachmentStorageService;
    private final UserIdentityService userIdentityService;
    private final AttachmentAccessService attachmentAccessService;

    @Operation(summary = "Upload encrypted file")
    @PostMapping("/upload")
    public Map<String, String> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "chatId", required = false) Long chatId,
            Authentication auth
    ) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Encrypted attachment is empty");
        }
        User user = userIdentityService.require(auth.getName());
        if (!attachmentAccessService.canUpload(chatId, user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to chat attachments");
        }
        // Uses getBytes() — acceptable for the configured max-file-size (20 MB default).
        // For larger files or production at scale, replace with streaming InputStream
        // and delegate to S3 multipart upload via AttachmentStorageService.
        String attachmentId = attachmentStorageService.upload(
                user.getId(),
                chatId,
                file.getBytes(),
                MediaType.APPLICATION_OCTET_STREAM_VALUE
        );
        return Map.of("attachmentId", attachmentId);
    }

    @Operation(summary = "Download encrypted file")
    @GetMapping("/{attachmentId}")
    public ResponseEntity<byte[]> download(@PathVariable String attachmentId, Authentication auth) throws IOException {
        EncryptedAttachment attachment = attachmentStorageService.findByAttachmentId(attachmentId);

        User currentUser = userIdentityService.require(auth.getName());
        if (!attachmentAccessService.canDownload(attachment, currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to attachment");
        }

        byte[] data = attachmentStorageService.download(attachmentId);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"encrypted-" + attachmentId + ".bin\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store, max-age=0")
                .header("X-Content-Type-Options", "nosniff")
                .body(data);
    }
}
