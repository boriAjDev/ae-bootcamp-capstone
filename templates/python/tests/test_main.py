from app_name.main import main


def test_main_runs(capsys):
    main()
    captured = capsys.readouterr()
    assert "Hello from" in captured.out
