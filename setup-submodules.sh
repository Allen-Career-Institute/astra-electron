#!/bin/bash

# Setup git submodules for easier repository management

echo "Setting up git submodules..."

# Add allen-ui-live as submodule
git submodule add https://github.com/your-org/allen-ui-live.git live-submodule

# Initialize and update submodules
git submodule init
git submodule update

echo "Submodules setup complete!"
echo "To update submodules: git submodule update --remote"
echo "To work on submodule: cd live-submodule && git checkout -b feature-branch"
