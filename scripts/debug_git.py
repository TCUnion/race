import subprocess
import os

def run(cmd):
    try:
        output = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT).decode('utf-8')
        print(f"CMD: {cmd}\nOUTPUT:\n{output}\n{'-'*20}")
    except subprocess.CalledProcessError as e:
        print(f"CMD: {cmd}\nERROR:\n{e.output.decode('utf-8')}\n{'-'*20}")

with open('git_debug_log.txt', 'w') as f:
    import sys
    sys.stdout = f
    run('git status')
    run('git remote -v')
    run('git log -2')
    run('git push origin main')
