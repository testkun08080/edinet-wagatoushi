"""Zip Slip guard tests for edinet_wrapper.downloader._safe_extract."""

import zipfile

import pytest
from edinet_wrapper.downloader import _safe_extract


def _make_zip(path, entries: dict[str, bytes]) -> None:
    with zipfile.ZipFile(path, "w") as zf:
        for name, data in entries.items():
            zf.writestr(name, data)


def test_extracts_normal_entries(tmp_path):
    zip_path = tmp_path / "ok.zip"
    _make_zip(zip_path, {"a.csv": b"1", "sub/b.csv": b"2"})
    dest = tmp_path / "out"
    dest.mkdir()
    with zipfile.ZipFile(zip_path) as zf:
        _safe_extract(zf, str(dest))
    assert (dest / "a.csv").read_bytes() == b"1"
    assert (dest / "sub" / "b.csv").read_bytes() == b"2"


def test_rejects_path_traversal(tmp_path):
    zip_path = tmp_path / "evil.zip"
    _make_zip(zip_path, {"../escape.txt": b"pwned"})
    dest = tmp_path / "out"
    dest.mkdir()
    with zipfile.ZipFile(zip_path) as zf, pytest.raises(ValueError, match="unsafe zip entry"):
        _safe_extract(zf, str(dest))
    assert not (tmp_path / "escape.txt").exists()
