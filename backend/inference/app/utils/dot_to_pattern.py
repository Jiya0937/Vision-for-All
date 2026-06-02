def dots_to_pattern(dots, cell_x, cell_y, cell_w, cell_h):
    """
    Given dot positions and a Braille cell's bounding box,
    figure out which of the 6 positions are raised.
    
    Cell layout:
      pos1(top-left)    pos4(top-right)
      pos2(mid-left)    pos5(mid-right)
      pos3(bot-left)    pos6(bot-right)
    """
    # Divide cell into left and right columns
    mid_x = cell_x + cell_w // 2

    # Divide cell into 3 rows
    third_h = cell_h // 3
    row1_y = cell_y + third_h
    row2_y = cell_y + 2 * third_h

    # Initialize all 6 positions as 0
    positions = [0, 0, 0, 0, 0, 0]

    for (dx, dy) in dots:
        # Determine column
        left = dx < mid_x

        # Determine row
        if dy < row1_y:
            row = 0       # top
        elif dy < row2_y:
            row = 1       # middle
        else:
            row = 2       # bottom

        # Map to position index
        if left:
            positions[row] = 1        # pos 1, 2, 3
        else:
            positions[row + 3] = 1    # pos 4, 5, 6

    return "".join(str(p) for p in positions)