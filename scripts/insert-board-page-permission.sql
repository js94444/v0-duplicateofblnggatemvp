-- 게시판 페이지 권한 추가
-- role_permissions 테이블에 /admin/board 페이지 권한 추가

-- 기존에 있으면 삭제 후 재삽입 (중복 방지)
DELETE FROM role_permissions WHERE page_path = '/admin/board';

-- admin 역할에 게시판 권한 추가 (기본: 허용)
INSERT INTO role_permissions (role, page_path, page_name, allowed)
VALUES ('admin', '/admin/board', '게시판', 1);

-- manager 역할에 게시판 권한 추가 (기본: 허용)
INSERT INTO role_permissions (role, page_path, page_name, allowed)
VALUES ('manager', '/admin/board', '게시판', 1);

-- viewer 역할에 게시판 권한 추가 (기본: 허용)
INSERT INTO role_permissions (role, page_path, page_name, allowed)
VALUES ('viewer', '/admin/board', '게시판', 1);

-- security 역할에 게시판 권한 추가 (기본: 비허용)
INSERT INTO role_permissions (role, page_path, page_name, allowed)
VALUES ('security', '/admin/board', '게시판', 0);

GO
