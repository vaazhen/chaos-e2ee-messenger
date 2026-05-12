package ru.messenger.chaosmessenger.attachment.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
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

    @Operation(summary = "Upload encrypted file")
    @PostMapping("/upload")
    public Map<String, String> upload(@RequestParam("file") MultipartFile file, Authentication auth) throws IOException {
        User user = userIdentityService.require(auth.getName());
        String attachmentId = attachmentStorageService.upload(
                user.getId(),
                file.getBytes(),
                file.getContentType()
        );
        return Map.of("attachmentId", attachmentId);
    }

    @Operation(summary = "Download encrypted file")
    @GetMapping("/{attachmentId}")
    public ResponseEntity<byte[]> download(@PathVariable String attachmentId) throws IOException {
        EncryptedAttachment attachment = attachmentStorageService.findByAttachmentId(attachmentId);
        byte[] data = attachmentStorageService.download(attachmentId);

        String contentType = attachment.getContentType() != null
                ? attachment.getContentType()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(data);
    }
}
