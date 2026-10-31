# Nhìn lại stack frame khi gọi hàm (x86-64)

> [!NOTE]
> Đây là ghi chú cá nhân khi mình đang học. Có thể còn sai sót.

Khi học assembly, mình hay bị rối ở chỗ “hàm gọi hàm thì stack thay đổi thế nào”.

## Stack frame cơ bản

Mỗi lần gọi hàm, CPU thường đẩy địa chỉ trả về vào stack.

```asm
push rbp
mov  rbp, rsp
sub  rsp, 0x20      ; chỗ cho biến local
; ... làm việc ...
leave
ret
